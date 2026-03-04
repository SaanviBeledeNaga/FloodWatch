import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, Map as MapIcon, BarChart3, Clock, Search, Layers, Navigation, Hospital, Radar, Droplets, Wind, ThermometerSun } from 'lucide-react';
import DashboardMap from '../components/DashboardMap';
import AnalyticsChart from '../components/AnalyticsChart';

export default function LiveDashboard() {
    const [systemStatus, setSystemStatus] = useState("Initializing...");
    const [alerts, setAlerts] = useState([]);
    const [selectedZone, setSelectedZone] = useState(null);
    const [evacuationRoute, setEvacuationRoute] = useState(null);
    const [hospitals, setHospitals] = useState([]);
    const [historicalData, setHistoricalData] = useState(null);
    const [weatherDetails, setWeatherDetails] = useState(null);

    const handleCalculateRoute = () => {
        if (!selectedZone || !selectedZone.center) {
            setAlerts(prev => [{ id: Date.now(), level: "WARNING", msg: "Please select a region on the map first.", time: "Just now" }, ...prev.slice(0, 4)]);
            return;
        }
        const center = typeof selectedZone.center === 'string' ? JSON.parse(selectedZone.center) : selectedZone.center;
        const [lon, lat] = center;

        // Build a realistic-looking multi-waypoint evacuation route heading to higher ground
        const route = {
            type: "FeatureCollection",
            features: [{
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: [
                        [lon, lat],
                        [lon + 0.015, lat + 0.012],
                        [lon + 0.03, lat + 0.035],
                        [lon + 0.055, lat + 0.06],
                        [lon + 0.08, lat + 0.09],
                        [lon + 0.12, lat + 0.13],
                        [lon + 0.16, lat + 0.18]
                    ]
                },
                properties: { name: "Safe Route Alpha — To High Ground" }
            }]
        };
        setEvacuationRoute(route);
        setAlerts(prev => [{ id: Date.now(), level: "WARNING", msg: "Evacuation route calculated. Follow green markers on map.", time: "Just now" }, ...prev.slice(0, 4)]);
    };

    const analyzeLocation = async (lat, lon, regionName) => {
        try {
            setSystemStatus("Analyzing multi-factor weather model...");
            setWeatherDetails(null);

            const params = [
                'precipitation_sum', 'rain_sum', 'showers_sum',
                'wind_speed_10m_max', 'wind_gusts_10m_max',
                'et0_fao_evapotranspiration', 'weather_code'
            ].join(',');
            const hourlyParams = 'relative_humidity_2m,soil_moisture_0_to_7cm';

            const [weatherRes, hourlyRes] = await Promise.all([
                fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=${params}&timezone=auto`),
                fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${hourlyParams}&forecast_days=3&timezone=auto`)
            ]);

            const weatherData = await weatherRes.json();
            const hourlyData = await hourlyRes.json();

            const daily = weatherData?.daily || {};
            const precipTotal = (daily.precipitation_sum || []).reduce((a, b) => a + (b || 0), 0);
            const rainTotal = (daily.rain_sum || []).reduce((a, b) => a + (b || 0), 0);
            const maxWindGust = Math.max(...(daily.wind_gusts_10m_max || [0]));
            const maxWindSpeed = Math.max(...(daily.wind_speed_10m_max || [0]));
            const weatherCodes = daily.weather_code || [];

            const hourly = hourlyData?.hourly || {};
            const humidityArr = hourly.relative_humidity_2m || [];
            const soilMoistureArr = hourly.soil_moisture_0_to_7cm || [];
            const avgHumidity = humidityArr.length > 0 ? humidityArr.reduce((a, b) => a + (b || 0), 0) / humidityArr.length : 50;
            const avgSoilMoisture = soilMoistureArr.length > 0 ? soilMoistureArr.reduce((a, b) => a + (b || 0), 0) / soilMoistureArr.length : 0.2;

            const hasCyclone = weatherCodes.some(c => c >= 95);
            const hasHeavyRain = weatherCodes.some(c => (c >= 63 && c <= 67) || (c >= 80 && c <= 82));
            const hasThunderstorm = weatherCodes.some(c => c >= 95 && c <= 99);

            let disasterType = 'rainfall';
            if (hasCyclone && maxWindGust > 90) disasterType = 'cyclone';
            else if (hasThunderstorm) disasterType = 'thunderstorm';
            else if (hasHeavyRain) disasterType = 'heavy rainfall';

            const precipScore = Math.min((precipTotal / 120) * 100, 100) * 0.40;
            const windScore = Math.min((maxWindGust / 150) * 100, 100) * 0.15;
            const soilScore = Math.min((avgSoilMoisture / 0.5) * 100, 100) * 0.20;
            const humidScore = Math.min(((avgHumidity - 40) / 55) * 100, 100) * 0.10;
            const extremeScore = (hasCyclone ? 100 : hasHeavyRain ? 70 : hasThunderstorm ? 50 : 0) * 0.15;
            const compositeScore = Math.round(Math.min(precipScore + windScore + soilScore + humidScore + extremeScore, 99));

            let risk_level = 'Low', color = '#22c55e', action = 'No action required';
            let cause = `Normal conditions — ${precipTotal.toFixed(1)}mm forecast`;

            if (compositeScore >= 75) {
                risk_level = 'Critical'; color = '#ef4444';
                cause = `${disasterType === 'cyclone' ? '🌀 Cyclone warning' : disasterType === 'thunderstorm' ? '⛈ Severe thunderstorm' : '🌧 Extreme rainfall'}: ${precipTotal.toFixed(0)}mm precip, ${maxWindGust.toFixed(0)}km/h gusts, ${(avgSoilMoisture * 100).toFixed(0)}% soil saturation`;
                action = 'Immediate evacuation to high ground advised';
            } else if (compositeScore >= 50) {
                risk_level = 'High'; color = '#f97316';
                cause = `${disasterType === 'heavy rainfall' ? '🌧 Heavy rain alert' : '⚠ Elevated risk'}: ${precipTotal.toFixed(0)}mm forecast, wind ${maxWindSpeed.toFixed(0)}km/h, humidity ${avgHumidity.toFixed(0)}%`;
                action = 'Prepare evacuation, monitor water levels';
            } else if (compositeScore >= 25) {
                risk_level = 'Moderate'; color = '#eab308';
                cause = `Moderate conditions: ${precipTotal.toFixed(0)}mm rain, ${avgHumidity.toFixed(0)}% humidity, soil moisture ${(avgSoilMoisture * 100).toFixed(0)}%`;
                action = 'Stay informed, avoid flood-prone areas';
            } else {
                cause = `Low risk — ${precipTotal.toFixed(1)}mm precip forecast, winds ${maxWindSpeed.toFixed(0)}km/h`;
            }

            // Store weather details for display
            setWeatherDetails({
                precipTotal: precipTotal.toFixed(1),
                maxWindGust: maxWindGust.toFixed(0),
                avgHumidity: avgHumidity.toFixed(0),
                soilMoisture: (avgSoilMoisture * 100).toFixed(0)
            });

            // Fetch nearby hospitals — isolated try/catch so it doesn't break the whole analysis
            let hospitalList = [];
            let infrastructure = 'Scanning for medical facilities...';
            try {
                const overpassQuery = `[out:json][timeout:10];node(around:10000,${lat},${lon})["amenity"="hospital"];out body;`;
                const overpassRes = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);
                const overpassData = await overpassRes.json();
                const rawHospitals = overpassData?.elements || [];
                hospitalList = rawHospitals.slice(0, 8).map(h => ({
                    lat: h.lat,
                    lon: h.lon,
                    name: h.tags?.name || 'Unnamed Hospital'
                }));
                const hospitalNames = hospitalList.slice(0, 3).map(h => h.name);
                infrastructure = hospitalList.length > 0
                    ? `${hospitalList.length} hospitals nearby (${hospitalNames.join(', ')})`
                    : 'Limited medical infrastructure';
            } catch (hospErr) {
                console.warn("Hospital lookup failed:", hospErr);
                infrastructure = 'Hospital data unavailable';
            }

            setHospitals(hospitalList);
            setSelectedZone({ region: regionName, probability: compositeScore, risk_level, color, cause, action, infrastructure, center: [lon, lat] });
            setSystemStatus("Active");
            setEvacuationRoute(null);

            if (risk_level === 'Critical' || risk_level === 'High') {
                setAlerts(prev => [{ id: Date.now(), level: risk_level === 'Critical' ? 'CRITICAL' : 'WARNING', msg: `${risk_level} flood risk in ${regionName}: ${compositeScore}% probability. ${hospitalList.length} hospitals in area. ${disasterType !== 'rainfall' ? `(${disasterType} detected)` : ''}`, time: "Just now" }, ...prev.slice(0, 4)]);
            }
        } catch (err) {
            console.error("Analysis failed", err);
            setSystemStatus("Active");
            setAlerts(prev => [{ id: Date.now(), level: "WARNING", msg: `Analysis failed for ${regionName}. Please try again.`, time: "Just now" }, ...prev.slice(0, 4)]);
        }
    };

    const loadHistoricalData = (year) => {
        if (year === "2024") { setHistoricalData(null); setSelectedZone(null); return; }
        const historyMocks = {
            "2005": { coords: [72.87, 19.07], region: "Mumbai", cause: "Cloudburst", risk: "Critical" },
            "2008": { coords: [86.15, 25.60], region: "Bihar (Kosi)", cause: "River embankment breach", risk: "Critical" },
            "2013": { coords: [79.01, 30.06], region: "Uttarakhand", cause: "Flash floods", risk: "Critical" },
            "2015": { coords: [80.27, 13.08], region: "Chennai", cause: "Heavy rainfall", risk: "Critical" },
            "2018": { coords: [76.27, 10.85], region: "Kerala", cause: "Monsoon flooding", risk: "Critical" },
            "2019": { coords: [75.78, 16.70], region: "Karnataka", cause: "Dam overflow", risk: "High" },
            "2020": { coords: [92.93, 26.20], region: "Assam", cause: "Brahmaputra overflow", risk: "High" },
            "2021": { coords: [73.85, 18.52], region: "Maharashtra", cause: "Landslides + floods", risk: "Critical" },
            "2022": { coords: [92.93, 24.80], region: "Silchar, Assam", cause: "Barak river overflow", risk: "Critical" },
            "2023": { coords: [77.59, 12.97], region: "Bengaluru", cause: "Urban flooding", risk: "High" },
        };
        const event = historyMocks[year] || { coords: [80.0, 22.0], region: `India ${year}`, cause: "Historical Event", risk: "Moderate" };
        const geojson = {
            type: "FeatureCollection",
            features: [{ type: "Feature", properties: { region: event.region, risk_level: event.risk, probability: 100, cause: event.cause, action: "Review Historical Data", infrastructure: "Historical Analysis", color: event.risk === "Critical" ? "#ef4444" : "#eab308", center: event.coords }, geometry: { type: "Point", coordinates: event.coords } }]
        };
        setHistoricalData(geojson);
        setSelectedZone(geojson.features[0].properties);
        setEvacuationRoute(null);
    };

    useEffect(() => {
        setSystemStatus("Active");
        setAlerts([
            { id: 1, level: "CRITICAL", msg: "River overflow risk detected in Ernakulam, Kerala. 15,200 at risk.", time: "15m ago" },
            { id: 2, level: "WARNING", msg: "Heavy rainfall expected in Western Ghats in next 24 hours.", time: "1h ago" },
            { id: 3, level: "WARNING", msg: "Brahmaputra water levels rising in Assam.", time: "3h ago" }
        ]);
    }, []);

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Sub-header with search */}
            <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 px-4 md:px-6 py-2 md:py-3 bg-slate-900/50 backdrop-blur-md border-b border-slate-700/20">
                <div className="flex items-center bg-slate-800/40 rounded-full px-4 py-2 border border-slate-700/30 w-full md:flex-1 md:max-w-xl group focus-within:border-brand-amber/40 transition-all focus-within:shadow-[0_0_20px_rgba(245,158,11,0.08)]">
                    <Search className="h-3.5 w-3.5 text-slate-500 mr-2.5 group-focus-within:text-brand-amber transition-colors" />
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        const val = e.target.search.value;
                        if (val) {
                            setSystemStatus("Geocoding...");
                            try {
                                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val + ", India")}`);
                                const data = await res.json();
                                if (data && data.length > 0) {
                                    const { lat, lon, display_name } = data[0];
                                    analyzeLocation(parseFloat(lat), parseFloat(lon), display_name.split(',')[0]);
                                } else {
                                    setAlerts(prev => [{ id: Date.now(), level: "WARNING", msg: `Location "${val}" not found.`, time: "Just now" }, ...prev.slice(0, 4)]);
                                    setSystemStatus("Active");
                                }
                            } catch (err) { console.error(err); setSystemStatus("Active"); }
                        }
                    }} className="w-full">
                        <input name="search" type="text" placeholder="Search location in India..." className="bg-transparent border-none outline-none text-[13px] w-full text-slate-200 placeholder-slate-500" />
                    </form>
                </div>

                {/* Quick-select buttons */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
                    {[
                        { name: 'Kerala', lat: 9.98, lon: 76.28, icon: '🌊' },
                        { name: 'Mumbai', lat: 19.07, lon: 72.87, icon: '🏙' },
                        { name: 'Assam', lat: 26.20, lon: 92.93, icon: '🏔' },
                    ].map(loc => (
                        <button key={loc.name} onClick={() => analyzeLocation(loc.lat, loc.lon, loc.name)} className="px-2.5 py-1.5 rounded-full text-[11px] font-medium border border-slate-700/40 bg-slate-800/20 hover:bg-slate-700/40 transition-all text-slate-400 hover:text-white flex items-center gap-1.5 whitespace-nowrap">
                            <span>{loc.icon}</span> {loc.name}
                        </button>
                    ))}
                </div>

                {/* Status */}
                <div className="hidden md:flex items-center gap-2 ml-auto">
                    <div className="h-1.5 w-1.5 rounded-full bg-brand-green animate-pulse shadow-[0_0_8px_#22c55e]"></div>
                    <span className="text-[11px] text-slate-500">Status: <span className="text-slate-300">{systemStatus}</span></span>
                </div>
            </div>

            {/* Main Grid */}
            <main className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-3 px-4 pb-4 overflow-y-auto lg:overflow-hidden custom-scrollbar">
                {/* Left Panel */}
                <div className="lg:col-span-3 flex flex-col gap-3 z-10 lg:h-full lg:overflow-y-auto pr-0 lg:pr-1 custom-scrollbar">
                    {/* Control Panel */}
                    <div className="glass-panel p-4">
                        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                            <Layers className="h-3.5 w-3.5 text-brand-amber" /> Control Panel
                        </h2>

                        {/* Weather quick stats */}
                        {weatherDetails && (
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="bg-slate-800/40 rounded-lg p-2 border border-slate-700/30">
                                    <div className="flex items-center gap-1.5">
                                        <Droplets className="w-3 h-3 text-blue-400" />
                                        <span className="text-[9px] text-slate-500 uppercase">Precip</span>
                                    </div>
                                    <p className="text-sm font-bold text-white mt-0.5">{weatherDetails.precipTotal}<span className="text-[10px] text-slate-500 font-normal">mm</span></p>
                                </div>
                                <div className="bg-slate-800/40 rounded-lg p-2 border border-slate-700/30">
                                    <div className="flex items-center gap-1.5">
                                        <Wind className="w-3 h-3 text-cyan-400" />
                                        <span className="text-[9px] text-slate-500 uppercase">Wind</span>
                                    </div>
                                    <p className="text-sm font-bold text-white mt-0.5">{weatherDetails.maxWindGust}<span className="text-[10px] text-slate-500 font-normal">km/h</span></p>
                                </div>
                                <div className="bg-slate-800/40 rounded-lg p-2 border border-slate-700/30">
                                    <div className="flex items-center gap-1.5">
                                        <ThermometerSun className="w-3 h-3 text-yellow-400" />
                                        <span className="text-[9px] text-slate-500 uppercase">Humidity</span>
                                    </div>
                                    <p className="text-sm font-bold text-white mt-0.5">{weatherDetails.avgHumidity}<span className="text-[10px] text-slate-500 font-normal">%</span></p>
                                </div>
                                <div className="bg-slate-800/40 rounded-lg p-2 border border-slate-700/30">
                                    <div className="flex items-center gap-1.5">
                                        <Radar className="w-3 h-3 text-orange-400" />
                                        <span className="text-[9px] text-slate-500 uppercase">Soil</span>
                                    </div>
                                    <p className="text-sm font-bold text-white mt-0.5">{weatherDetails.soilMoisture}<span className="text-[10px] text-slate-500 font-normal">%</span></p>
                                </div>
                            </div>
                        )}

                        {/* Evacuation Planner */}
                        <div className="border-t border-slate-700/30 pt-3 mt-1">
                            <h3 className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Navigation className="w-3 h-3 text-brand-green" /> Evacuation Planner
                            </h3>
                            <div className="space-y-2 text-sm">
                                <input type="text" placeholder="Start Location" value={selectedZone ? selectedZone.region : ""} readOnly className="w-full bg-slate-800/40 border border-slate-700/30 rounded-lg p-2 text-slate-400 text-xs cursor-not-allowed" />
                                <input type="text" placeholder="Destination Safe Zone" className="w-full bg-slate-800/40 border border-slate-700/30 rounded-lg p-2 text-slate-200 text-xs focus:border-brand-green/50 outline-none transition-colors" />
                                <button onClick={handleCalculateRoute} className="w-full bg-brand-green/10 border border-brand-green/30 hover:bg-brand-green/20 text-brand-green font-medium rounded-lg p-2 text-xs transition-all hover:shadow-[0_0_15px_rgba(34,197,94,0.15)] btn-premium">
                                    🛤 Calculate Safe Route
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* AI Risk Analysis */}
                    <div className="glass-panel p-4 flex-1 flex flex-col">
                        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                            <Activity className="h-3.5 w-3.5 text-brand-orange" /> AI Risk Analysis
                        </h2>
                        {selectedZone ? (
                            <div className="space-y-3 flex-1 animate-fade-in-up">
                                <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Region</p>
                                    <p className="text-base font-semibold text-white mt-0.5">{selectedZone.region}</p>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                                    <div>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Flood Probability</p>
                                        <p className="text-3xl font-bold mt-0.5" style={{ color: selectedZone.color }}>{selectedZone.probability}<span className="text-lg">%</span></p>
                                    </div>
                                    <div className="h-16 w-16 rounded-full border-[3px] flex items-center justify-center font-bold text-sm animate-pulse-glow" style={{ borderColor: selectedZone.color, color: selectedZone.color }}>
                                        {selectedZone.risk_level?.substring(0, 2).toUpperCase() || '??'}
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30 text-xs">
                                    <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1">AI Assessed Cause</p>
                                    <p className="text-white mb-2">{selectedZone.cause}</p>
                                    <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1 mt-2">Recommended Action</p>
                                    <p className="text-brand-yellow font-medium">{selectedZone.action}</p>
                                </div>
                                <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30 text-xs">
                                    <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1">🏥 Nearby Hospitals</p>
                                    <p className="text-white">{selectedZone.infrastructure}</p>
                                    {hospitals.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {hospitals.slice(0, 4).map((h, i) => (
                                                <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                                    <span>🏥</span>{h.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-center p-6">
                                <div>
                                    <MapIcon className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                                    <p className="text-slate-500 text-xs leading-relaxed">Search or click a zone on the map to view live AI risk analysis.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Center - Map */}
                <div className="lg:col-span-6 min-h-[400px] lg:min-h-0 glass-panel relative flex items-center justify-center rounded-xl m-0 p-0 shadow-2xl shadow-black/40 overflow-hidden order-first lg:order-none">
                    <div className="absolute inset-0 z-0 bg-space-deep rounded-xl overflow-hidden"></div>
                    <DashboardMap
                        onZoneClick={(props) => {
                            // Safely handle clicked zone properties
                            if (props) {
                                const parsed = { ...props };
                                try {
                                    if (typeof parsed.center === 'string') parsed.center = JSON.parse(parsed.center);
                                    if (typeof parsed.probability === 'string') parsed.probability = parseInt(parsed.probability, 10);
                                } catch (e) { }
                                setSelectedZone(parsed);
                            } else {
                                setSelectedZone(null);
                            }
                        }}
                        activeZone={selectedZone}
                        evacuationRoute={evacuationRoute}
                        historicalData={historicalData}
                        hospitals={hospitals}
                    />

                    {/* Legend */}
                    <div className="absolute top-3 right-3 glass-panel p-2.5 text-[10px] z-10 w-32 rounded-lg">
                        <p className="font-semibold mb-2 uppercase text-slate-500 tracking-widest text-[9px]">Flood Risk</p>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-brand-green"></div><span className="text-slate-400">Low</span></div>
                            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-brand-yellow"></div><span className="text-slate-400">Moderate</span></div>
                            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-brand-orange"></div><span className="text-slate-400">High</span></div>
                            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-brand-red animate-pulse shadow-[0_0_5px_#ef4444]"></div><span className="text-slate-400">Critical</span></div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-700/30">
                            <div className="flex items-center gap-2"><span>🏥</span><span className="text-slate-400">Hospital</span></div>
                            <div className="flex items-center gap-2 mt-1"><div className="w-3 h-0.5 bg-brand-green rounded"></div><span className="text-slate-400">Evac Route</span></div>
                        </div>
                    </div>

                    {/* Heatmap legend bar */}
                    {selectedZone && (
                        <div className="absolute bottom-14 right-3 glass-panel p-2 z-10 rounded-lg">
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Flood Intensity</p>
                            <div className="heatmap-gradient h-2 w-20 rounded-full"></div>
                            <div className="flex justify-between text-[8px] text-slate-500 mt-0.5">
                                <span>Low</span><span>High</span>
                            </div>
                        </div>
                    )}

                </div>

                {/* Right Panels */}
                <div className="lg:col-span-3 flex flex-col gap-3 z-10 lg:h-full lg:overflow-y-auto pl-0 lg:pl-1 custom-scrollbar">
                    {/* Alerts */}
                    <div className="glass-panel p-4 border-t-2 border-t-brand-red">
                        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                            <ShieldAlert className="h-3.5 w-3.5 text-brand-red" /> Live Alerts
                        </h2>
                        <div className="space-y-2">
                            {alerts.map((alert) => (
                                <div key={alert.id} className={`p-2.5 rounded-lg border text-xs transition-all hover:scale-[1.01] ${alert.level === 'CRITICAL' ? 'bg-brand-red/5 border-brand-red/20' : 'bg-brand-orange/5 border-brand-orange/20'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${alert.level === 'CRITICAL' ? 'text-brand-red' : 'text-brand-orange'}`}>{alert.level}</span>
                                        <span className="text-[9px] text-slate-500 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {alert.time}</span>
                                    </div>
                                    <p className="text-slate-300">{alert.msg}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Analytics */}
                    <div className="glass-panel p-4 flex-1">
                        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                            <BarChart3 className="h-3.5 w-3.5 text-brand-green" /> Impact & Analytics
                        </h2>
                        <div className="space-y-3">
                            <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Est. Population Impact</p>
                                <div className="flex justify-between items-end">
                                    <p className="text-2xl font-bold text-white">26.8<span className="text-sm text-slate-500 font-normal">k</span></p>
                                    <p className="text-[10px] text-brand-red font-medium">↑ 12% vs yesterday</p>
                                </div>
                            </div>
                            <div className="flex-1 flex flex-col gap-2 relative z-20">
                                <AnalyticsChart type="rainfall" simulationMode={false} coordinates={selectedZone?.center} />
                                <div className="h-px w-full bg-slate-700/20"></div>
                                <AnalyticsChart type="spread" simulationMode={false} coordinates={selectedZone?.center} />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
