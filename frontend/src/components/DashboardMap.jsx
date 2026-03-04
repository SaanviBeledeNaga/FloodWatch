import React, { useState, useEffect, useRef } from 'react';
import Map, { Source, Layer, NavigationControl, FullscreenControl, Marker, Popup } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

// Esri World Imagery (Satellite) style
const mapStyle = {
    version: 8,
    sources: {
        satellite: {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            attribution: '&copy; Esri'
        },
        'terrain-source': {
            type: 'raster-dem',
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
            encoding: 'terrarium',
            tileSize: 256,
            maxzoom: 14
        }
    },
    layers: [
        {
            id: 'satellite-layer',
            type: 'raster',
            source: 'satellite',
            minzoom: 0,
            maxzoom: 22
        }
    ],
    terrain: {
        source: 'terrain-source',
        exaggeration: 1.5
    }
};

// Flood zone fill
const floodZoneLayer = {
    id: 'flood-zones',
    type: 'fill',
    paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': 0.35
    }
};

const floodZoneOutlineLayer = {
    id: 'flood-zones-outline',
    type: 'line',
    paint: {
        'line-color': ['get', 'color'],
        'line-width': 2.5,
        'line-opacity': 0.8
    }
};

// Heatmap layer for flood-prone intensity
const floodHeatmapLayer = {
    id: 'flood-heatmap',
    type: 'heatmap',
    paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'probability'], 0, 0, 100, 1],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
        'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.15, 'rgba(34,197,94,0.4)',
            0.35, 'rgba(234,179,8,0.5)',
            0.55, 'rgba(249,115,22,0.6)',
            0.75, 'rgba(239,68,68,0.7)',
            1, 'rgba(239,68,68,0.9)'
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 15, 15, 40],
        'heatmap-opacity': 0.7
    }
};

// Evacuation route
const routeLayer = {
    id: 'evacuation-route',
    type: 'line',
    paint: {
        'line-color': '#22c55e',
        'line-width': 4,
        'line-dasharray': [2, 2],
        'line-opacity': 0.9
    }
};

const routeGlowLayer = {
    id: 'evacuation-route-glow',
    type: 'line',
    paint: {
        'line-color': '#22c55e',
        'line-width': 10,
        'line-opacity': 0.15,
        'line-blur': 6
    }
};

// Route direction arrows
const routeArrowLayer = {
    id: 'evacuation-arrows',
    type: 'symbol',
    layout: {
        'symbol-placement': 'line',
        'symbol-spacing': 80,
        'text-field': '▶',
        'text-size': 14,
        'text-rotate': 0,
        'text-rotation-alignment': 'map',
        'text-allow-overlap': true,
        'text-ignore-placement': true
    },
    paint: {
        'text-color': '#22c55e',
        'text-halo-color': 'rgba(0,0,0,0.6)',
        'text-halo-width': 1
    }
};

// Historical marker
const historicalLayer = {
    id: 'historical-markers',
    type: 'circle',
    paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': 10,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
    }
};

// Generates heatmap-compatible point grid from a zone polygon
function generateHeatmapPoints(activeZone) {
    if (!activeZone || !activeZone.center) return null;
    const [lon, lat] = activeZone.center;
    const probability = activeZone.probability || 50;
    const gridSize = 0.01; // ~1km spacing
    const span = 0.06;
    const points = [];

    for (let dLon = -span; dLon <= span; dLon += gridSize) {
        for (let dLat = -span; dLat <= span; dLat += gridSize) {
            const dist = Math.sqrt(dLon * dLon + dLat * dLat);
            if (dist > span) continue;
            // Probability decreases with distance from center
            const falloff = 1 - (dist / span);
            const localProb = Math.round(probability * falloff * (0.7 + Math.random() * 0.3));
            if (localProb > 5) {
                points.push({
                    type: "Feature",
                    properties: { probability: localProb },
                    geometry: { type: "Point", coordinates: [lon + dLon, lat + dLat] }
                });
            }
        }
    }

    return { type: "FeatureCollection", features: points };
}

export default function DashboardMap({
    simulatedZones = null,
    onZoneClick,
    evacuationRoute = null,
    historicalData = null,
    activeZone = null,
    hospitals = []
}) {
    const [viewState, setViewState] = useState({
        longitude: 80.0,
        latitude: 22.0,
        zoom: 4,
        pitch: 0,
        bearing: 0
    });

    const [mapMode, setMapMode] = useState('2D');
    const [floodData, setFloodData] = useState(null);
    const [heatmapData, setHeatmapData] = useState(null);
    const [selectedHospital, setSelectedHospital] = useState(null);

    useEffect(() => {
        if (simulatedZones) {
            setFloodData(simulatedZones);
            // Generate heatmap from simulated zone
            const zone = simulatedZones.features?.[0]?.properties;
            if (zone) setHeatmapData(generateHeatmapPoints(zone));
            return;
        }

        if (activeZone && activeZone.center) {
            const center = typeof activeZone.center === 'string' ? JSON.parse(activeZone.center) : activeZone.center;
            const [lon, lat] = center;
            const size = 0.05;
            setFloodData({
                type: "FeatureCollection",
                features: [{
                    type: "Feature",
                    properties: { ...activeZone, center: [lon, lat] },
                    geometry: { type: "Polygon", coordinates: [[[lon - size, lat - size], [lon + size, lat - size], [lon + size, lat + size], [lon - size, lat + size], [lon - size, lat - size]]] }
                }]
            });
            setHeatmapData(generateHeatmapPoints({ ...activeZone, center: [lon, lat] }));
            setViewState(prev => ({ ...prev, longitude: lon, latitude: lat, zoom: 11, transitionDuration: 1000 }));
            return;
        }

        // Default fallback data
        setFloodData({
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    properties: { risk_level: "Critical", color: "#ef4444", region: "Ernakulam, Kerala", probability: 89, cause: "Extreme Monsoon Downpour", action: "Immediate evacuation to high ground", infrastructure: "Hospitals at risk", center: [76.27, 9.95] },
                    geometry: { type: "Polygon", coordinates: [[[76.25, 9.92], [76.30, 9.92], [76.30, 9.98], [76.25, 9.98], [76.25, 9.92]]] }
                },
                {
                    type: "Feature",
                    properties: { risk_level: "Moderate", color: "#eab308", region: "Guwahati, Assam", probability: 65, cause: "Brahmaputra river level rising", action: "Prepare for evacuation", infrastructure: "Transport routes affected", center: [91.75, 26.18] },
                    geometry: { type: "Polygon", coordinates: [[[91.70, 26.15], [91.80, 26.15], [91.80, 26.20], [91.70, 26.20], [91.70, 26.15]]] }
                }
            ]
        });
        setHeatmapData(null);
    }, [simulatedZones, activeZone]);

    const onClick = (event) => {
        const feature = event.features && event.features[0];
        if (feature) {
            // Parse all stringified JSON properties from GeoJSON
            const props = { ...feature.properties };
            try {
                if (typeof props.center === 'string') props.center = JSON.parse(props.center);
            } catch (e) { }
            try {
                if (typeof props.probability === 'string') props.probability = parseInt(props.probability, 10);
            } catch (e) { }

            if (props.center) {
                const center = Array.isArray(props.center) ? props.center : [80, 22];
                setViewState(prev => ({ ...prev, longitude: center[0], latitude: center[1], zoom: 11, transitionDuration: 1000 }));
            }
            if (onZoneClick) onZoneClick(props);
        }
    };

    const toggle3D = () => {
        if (mapMode === '2D') {
            setMapMode('3D');
            setViewState(prev => ({ ...prev, pitch: 60, bearing: -20, transitionDuration: 1000 }));
        } else {
            setMapMode('2D');
            setViewState(prev => ({ ...prev, pitch: 0, bearing: 0, transitionDuration: 1000 }));
        }
    };

    return (
        <div className="w-full h-full relative group">
            <Map
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                mapStyle={mapStyle}
                interactiveLayerIds={['flood-zones']}
                onClick={onClick}
                cursor="crosshair"
            >
                <NavigationControl position="top-left" />
                <FullscreenControl position="top-right" />

                {/* 2D / 3D Toggle */}
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
                    <button
                        onClick={(e) => { e.stopPropagation(); toggle3D(); }}
                        className="glass-panel px-4 py-1.5 text-xs font-bold tracking-wider hover:bg-slate-700/50 transition-all uppercase flex items-center gap-2 text-slate-300 hover:text-white"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse"></span>
                        {mapMode === '2D' ? '3D Terrain' : '2D View'}
                    </button>
                </div>

                {/* Dark tint overlay for theme consistency */}
                <div className="absolute inset-0 bg-[#050a14] mix-blend-multiply opacity-30 pointer-events-none z-0"></div>

                {/* Heatmap layer — flood-prone pixel intensity */}
                {heatmapData && (
                    <Source id="heatmap-data" type="geojson" data={heatmapData}>
                        <Layer {...floodHeatmapLayer} />
                    </Source>
                )}

                {/* Flood zone fill + outline */}
                {floodData && !historicalData && (
                    <Source id="flood-data" type="geojson" data={floodData}>
                        <Layer {...floodZoneLayer} />
                        <Layer {...floodZoneOutlineLayer} />
                    </Source>
                )}

                {/* Evacuation route with glow + arrows */}
                {evacuationRoute && (
                    <Source id="evacuation-data" type="geojson" data={evacuationRoute}>
                        <Layer {...routeGlowLayer} />
                        <Layer {...routeLayer} />
                        <Layer {...routeArrowLayer} />
                    </Source>
                )}

                {/* Historical data markers */}
                {historicalData && (
                    <Source id="historical-data" type="geojson" data={historicalData}>
                        <Layer {...historicalLayer} />
                    </Source>
                )}

                {/* Hospital markers with 🏥 emoji */}
                {hospitals.map((h, i) => (
                    <Marker
                        key={`hospital-${i}`}
                        longitude={h.lon}
                        latitude={h.lat}
                        anchor="center"
                    >
                        <div
                            className="hospital-marker"
                            title={h.name}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedHospital(h);
                            }}
                        >
                            🏥
                        </div>
                    </Marker>
                ))}

                {/* Hospital popup */}
                {selectedHospital && (
                    <Popup
                        longitude={selectedHospital.lon}
                        latitude={selectedHospital.lat}
                        anchor="bottom"
                        onClose={() => setSelectedHospital(null)}
                        closeButton={true}
                        closeOnClick={false}
                        offset={15}
                    >
                        <div className="px-2 py-1">
                            <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span>🏥</span> {selectedHospital.name}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Nearest Medical Facility</p>
                        </div>
                    </Popup>
                )}
            </Map>
        </div>
    );
}
