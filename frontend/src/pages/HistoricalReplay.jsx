import React, { useState } from 'react';
import { Activity, CalendarDays, MapPin, Search, Loader2, Clock, BarChart3, ShieldAlert, Navigation, Droplets, Wind, ThermometerSun } from 'lucide-react';
import DashboardMap from '../components/DashboardMap';
import AnalyticsChart from '../components/AnalyticsChart';

export default function HistoricalReplay() {
    const [selectedZone, setSelectedZone] = useState(null);
    const [evacuationRoute, setEvacuationRoute] = useState(null);
    const [replayLog, setReplayLog] = useState([]);
    const [histDate, setHistDate] = useState('');
    const [histLocation, setHistLocation] = useState('');
    const [histLoading, setHistLoading] = useState(false);
    const [hospitals, setHospitals] = useState([]);
    const [simulatedZones, setSimulatedZones] = useState(null);
    const [weatherDetails, setWeatherDetails] = useState(null);

    const today = new Date();
    const tenYearsAgo = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate());
    const maxDate = new Date(today.getTime() - 86400000 * 2);
    const minDateStr = tenYearsAgo.toISOString().split('T')[0];
    const maxDateStr = maxDate.toISOString().split('T')[0];

    // Famous Indian flood events for quick-select
    const quickEvents = [
        { label: 'Kerala 2018', date: '2018-08-15', location: 'Kerala' },
        { label: 'Mumbai 2005', date: '2005-07-26', location: 'Mumbai' },
        { label: 'Uttarakhand 2013', date: '2013-06-16', location: 'Kedarnath' },
        { label: 'Chennai 2015', date: '2015-12-01', location: 'Chennai' },
        { label: 'Assam 2020', date: '2020-07-14', location: 'Guwahati' },
    ];

    const runHistoricalReplay = async (overrideDate, overrideLocation) => {
        const date = overrideDate || histDate;
        const location = overrideLocation || histLocation;
        if (!date || !location) return;

        setHistDate(date);
        setHistLocation(location);
        setHistLoading(true);
        setWeatherDetails(null);
        setReplayLog(prev => [{ id: Date.now(), level: 'WARNING', msg: `Fetching weather archive for "${location}" on ${date}...`, time: 'Just now' }, ...prev.slice(0, 7)]);

        try {
            // Step 1: Geocode
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location + ", India")}`);
            const geoData = await geoRes.json();
            if (!geoData || geoData.length === 0) {
                setReplayLog(prev => [{ id: Date.now(), level: 'CRITICAL', msg: `Location "${location}" not found.`, time: 'Just now' }, ...prev.slice(0, 7)]);
                setHistLoading(false);
                return;
            }
            const lat = parseFloat(geoData[0].lat);
            const lon = parseFloat(geoData[0].lon);
            const regionName = geoData[0].display_name.split(',')[0];

            // Step 2: Fetch historical weather
            const archiveRes = await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${date}&end_date=${date}&daily=precipitation_sum,rain_sum,temperature_2m_max,wind_speed_10m_max,wind_gusts_10m_max&hourly=relative_humidity_2m,soil_moisture_0_to_7cm&timezone=auto`);
            const archiveData = await archiveRes.json();

            const precip = archiveData?.daily?.precipitation_sum?.[0] || 0;
            const rain = archiveData?.daily?.rain_sum?.[0] || 0;
            const tempMax = archiveData?.daily?.temperature_2m_max?.[0] || 'N/A';
            const windMax = archiveData?.daily?.wind_speed_10m_max?.[0] || 0;
            const gustMax = archiveData?.daily?.wind_gusts_10m_max?.[0] || 0;

            const humidityArr = archiveData?.hourly?.relative_humidity_2m || [];
            const soilArr = archiveData?.hourly?.soil_moisture_0_to_7cm || [];
            const avgHumidity = humidityArr.length > 0 ? humidityArr.reduce((a, b) => a + (b || 0), 0) / humidityArr.length : 50;
            const avgSoil = soilArr.length > 0 ? soilArr.reduce((a, b) => a + (b || 0), 0) / soilArr.length : 0.2;

            // Composite flood risk scoring
            const precipScore = Math.min((precip / 80) * 100, 100) * 0.45;
            const windScore = Math.min((gustMax / 120) * 100, 100) * 0.15;
            const soilScore = Math.min((avgSoil / 0.5) * 100, 100) * 0.20;
            const humidScore = Math.min(((avgHumidity - 40) / 55) * 100, 100) * 0.10;
            const extremeFlag = (precip > 80 ? 100 : precip > 40 ? 60 : 0) * 0.10;

            let probability = Math.round(Math.min(precipScore + windScore + soilScore + humidScore + extremeFlag, 99));
            probability = Math.max(probability, 5);

            let risk_level = 'Low', color = '#22c55e';
            let cause = `Recorded precipitation: ${precip.toFixed(1)}mm (rain: ${rain.toFixed(1)}mm, temp: ${tempMax}°C)`;
            let action = 'No significant flood risk on this date.';

            if (probability >= 75) { risk_level = 'Critical'; color = '#ef4444'; action = 'Extreme flooding likely — full evacuation warranted'; }
            else if (probability >= 50) { risk_level = 'High'; color = '#f97316'; action = 'Significant flood risk — evacuation advisable'; }
            else if (probability >= 25) { risk_level = 'Moderate'; color = '#eab308'; action = 'Moderate risk — monitor river levels'; }

            setWeatherDetails({
                precipTotal: precip.toFixed(1),
                maxWindGust: gustMax.toFixed(0),
                avgHumidity: avgHumidity.toFixed(0),
                soilMoisture: (avgSoil * 100).toFixed(0),
                tempMax: typeof tempMax === 'number' ? tempMax.toFixed(1) : tempMax,
                rainTotal: rain.toFixed(1)
            });

            const zone = { region: `${regionName} (${date})`, probability, risk_level, color, cause, action, infrastructure: `Historical replay — actual weather data`, center: [lon, lat] };
            const size = 0.08;
            const zoneGeo = {
                type: "FeatureCollection",
                features: [{
                    type: "Feature",
                    properties: zone,
                    geometry: { type: "Polygon", coordinates: [[[lon - size, lat - size], [lon + size, lat - size], [lon + size, lat + size], [lon - size, lat + size], [lon - size, lat - size]]] }
                }]
            };

            setSimulatedZones(zoneGeo);
            setSelectedZone(zone);
            setEvacuationRoute(null);

            // Try to fetch hospitals for the historical location
            let hospitalList = [];
            try {
                const overpassQuery = `[out:json][timeout:10];node(around:10000,${lat},${lon})["amenity"="hospital"];out body;`;
                const overpassRes = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);
                const overpassData = await overpassRes.json();
                hospitalList = (overpassData?.elements || []).slice(0, 8).map(h => ({
                    lat: h.lat, lon: h.lon, name: h.tags?.name || 'Unnamed Hospital'
                }));
            } catch (e) { console.warn("Hospital lookup failed:", e); }
            setHospitals(hospitalList);

            setReplayLog(prev => [
                { id: Date.now(), level: risk_level === 'Critical' ? 'CRITICAL' : 'WARNING', msg: `Historical replay: ${regionName} on ${date} — ${precip.toFixed(1)}mm precipitation. Risk: ${risk_level} (${probability}%)`, time: 'Just now' },
                { id: Date.now() + 1, level: 'WARNING', msg: `Max temp: ${tempMax}°C | Wind gusts: ${gustMax.toFixed(0)}km/h | Humidity: ${avgHumidity.toFixed(0)}% | Soil: ${(avgSoil * 100).toFixed(0)}%`, time: 'Just now' },
                { id: Date.now() + 2, level: 'WARNING', msg: `${hospitalList.length} hospitals found in evacuation range`, time: 'Just now' },
                ...prev.slice(0, 5),
            ]);
        } catch (err) {
            console.error('Historical replay failed', err);
            setReplayLog(prev => [{ id: Date.now(), level: 'CRITICAL', msg: `Archive API request failed. ${err.message}`, time: 'Just now' }, ...prev.slice(0, 7)]);
        }
        setHistLoading(false);
    };

    const calcRoute = () => {
        if (!selectedZone?.center) return;
        const center = typeof selectedZone.center === 'string' ? JSON.parse(selectedZone.center) : selectedZone.center;
        const [lon, lat] = center;
        setEvacuationRoute({
            type: "FeatureCollection",
            features: [{
                type: "Feature",
                geometry: { type: "LineString", coordinates: [[lon, lat], [lon + 0.02, lat + 0.03], [lon + 0.05, lat + 0.06], [lon + 0.08, lat + 0.1], [lon + 0.12, lat + 0.15]] },
                properties: { name: "Historical Evac Route" }
            }]
        });
        setReplayLog(prev => [{ id: Date.now(), level: 'WARNING', msg: 'Evacuation route generated for historical analysis.', time: 'Just now' }, ...prev.slice(0, 7)]);
    };

    const clearReplay = () => {
        setSimulatedZones(null);
        setSelectedZone(null);
        setEvacuationRoute(null);
        setHospitals([]);
        setWeatherDetails(null);
        setReplayLog(prev => [{ id: Date.now(), level: 'WARNING', msg: 'Replay cleared.', time: 'Just now' }, ...prev.slice(0, 7)]);
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Banner */}
            <div className="mx-4 mt-2 px-3 py-1.5 rounded-lg bg-brand-amber/5 border border-brand-amber/20 flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-brand-amber animate-pulse" />
                <span className="text-[10px] text-brand-amber font-medium uppercase tracking-wider">Historical Weather Archive — Open-Meteo Data</span>
            </div>

            {/* Main Grid */}
            <main className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-3 p-4 overflow-y-auto lg:overflow-hidden custom-scrollbar">
                {/* Left — Controls */}
                <div className="lg:col-span-3 flex flex-col gap-3 z-10 lg:h-full lg:overflow-y-auto pr-0 lg:pr-1 custom-scrollbar">
                    {/* Date + Location Selector */}
                    <div className="glass-panel p-4">
                        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-brand-amber mb-3 flex items-center gap-2">
                            <CalendarDays className="h-3.5 w-3.5" /> Replay Controls
                        </h2>
                        <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">Pick a date and location to replay actual weather conditions and flood patterns.</p>

                        <div className="space-y-2">
                            <div className="relative">
                                <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                                <input
                                    type="date"
                                    min={minDateStr}
                                    max={maxDateStr}
                                    value={histDate}
                                    onChange={(e) => setHistDate(e.target.value)}
                                    className="w-full bg-slate-800/40 border border-slate-700/30 rounded-lg p-2 pl-8 text-xs text-slate-200 outline-none focus:border-brand-amber/50 transition-colors [color-scheme:dark]"
                                />
                            </div>
                            <div className="relative">
                                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Location (e.g., Wayanad, Mumbai)"
                                    value={histLocation}
                                    onChange={(e) => setHistLocation(e.target.value)}
                                    className="w-full bg-slate-800/40 border border-slate-700/30 rounded-lg p-2 pl-8 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-brand-amber/50 transition-colors"
                                />
                            </div>
                            <button
                                onClick={() => runHistoricalReplay()}
                                disabled={!histDate || !histLocation || histLoading}
                                className="w-full bg-brand-amber/10 border border-brand-amber/30 hover:bg-brand-amber/20 text-brand-amber font-medium rounded-lg p-2.5 text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 btn-premium"
                            >
                                {histLoading ? <><Loader2 className="w-3 h-3 animate-spin" /> Fetching Archive...</> : <><Search className="w-3 h-3" /> Replay This Date</>}
                            </button>
                        </div>

                        {/* Quick Events */}
                        <div className="mt-3 pt-3 border-t border-slate-700/30">
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-2">⚡ Quick Events</p>
                            <div className="flex flex-wrap gap-1.5">
                                {quickEvents.map(ev => (
                                    <button
                                        key={ev.label}
                                        onClick={() => runHistoricalReplay(ev.date, ev.location)}
                                        disabled={histLoading}
                                        className="px-2.5 py-1 rounded-full text-[10px] font-medium border border-slate-700/30 bg-slate-800/20 hover:bg-slate-700/40 hover:border-brand-amber/30 transition-all text-slate-400 hover:text-white disabled:opacity-40"
                                    >
                                        {ev.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Evacuation + Clear */}
                        {selectedZone && (
                            <div className="mt-3 pt-3 border-t border-slate-700/30 space-y-2">
                                <button onClick={calcRoute} className="w-full bg-brand-green/10 border border-brand-green/30 hover:bg-brand-green/20 text-brand-green font-medium rounded-lg p-2 text-xs transition-all btn-premium">
                                    🛤 Generate Evacuation Route
                                </button>
                                <button onClick={clearReplay} className="w-full bg-slate-800/30 border border-slate-700/30 hover:bg-slate-700/30 text-slate-400 font-medium rounded-lg p-2 text-xs transition-all">
                                    Clear Replay
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Weather Details */}
                    {weatherDetails && (
                        <div className="glass-panel p-4 animate-fade-in-up">
                            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                                <ThermometerSun className="h-3.5 w-3.5 text-brand-amber" /> Weather Details
                            </h2>
                            <div className="grid grid-cols-2 gap-2">
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
                                        <span className="text-[9px] text-slate-500 uppercase">Gusts</span>
                                    </div>
                                    <p className="text-sm font-bold text-white mt-0.5">{weatherDetails.maxWindGust}<span className="text-[10px] text-slate-500 font-normal">km/h</span></p>
                                </div>
                                <div className="bg-slate-800/40 rounded-lg p-2 border border-slate-700/30">
                                    <div className="flex items-center gap-1.5">
                                        <ThermometerSun className="w-3 h-3 text-yellow-400" />
                                        <span className="text-[9px] text-slate-500 uppercase">Temp</span>
                                    </div>
                                    <p className="text-sm font-bold text-white mt-0.5">{weatherDetails.tempMax}<span className="text-[10px] text-slate-500 font-normal">°C</span></p>
                                </div>
                                <div className="bg-slate-800/40 rounded-lg p-2 border border-slate-700/30">
                                    <div className="flex items-center gap-1.5">
                                        <Droplets className="w-3 h-3 text-green-400" />
                                        <span className="text-[9px] text-slate-500 uppercase">Soil</span>
                                    </div>
                                    <p className="text-sm font-bold text-white mt-0.5">{weatherDetails.soilMoisture}<span className="text-[10px] text-slate-500 font-normal">%</span></p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Risk Analysis Panel */}
                    <div className="glass-panel p-4 flex-1 flex flex-col">
                        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                            <Activity className="h-3.5 w-3.5 text-brand-orange" /> Replay Analysis
                        </h2>
                        {selectedZone ? (
                            <div className="space-y-3 flex-1 animate-fade-in-up">
                                <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Region & Date</p>
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
                                    <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1">Recorded Conditions</p>
                                    <p className="text-white mb-2">{selectedZone.cause}</p>
                                    <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1 mt-2">Assessment</p>
                                    <p className="text-brand-yellow font-medium">{selectedZone.action}</p>
                                </div>
                                {hospitals.length > 0 && (
                                    <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30 text-xs">
                                        <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1">🏥 Nearby Hospitals</p>
                                        <div className="space-y-1 mt-1">
                                            {hospitals.slice(0, 5).map((h, i) => (
                                                <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                                    <span>🏥</span>{h.name}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-center p-6">
                                <div>
                                    <CalendarDays className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                                    <p className="text-slate-500 text-xs leading-relaxed">Select a date and location above to replay historical flood conditions.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Center — Map */}
                <div className="lg:col-span-6 min-h-[400px] lg:min-h-0 glass-panel relative flex items-center justify-center rounded-xl m-0 p-0 shadow-2xl shadow-black/40 overflow-hidden order-first lg:order-none">
                    <div className="absolute inset-0 z-0 bg-space-deep rounded-xl overflow-hidden"></div>
                    <DashboardMap
                        onZoneClick={(props) => {
                            if (props) {
                                const parsed = { ...props };
                                try {
                                    if (typeof parsed.center === 'string') parsed.center = JSON.parse(parsed.center);
                                    if (typeof parsed.probability === 'string') parsed.probability = parseInt(parsed.probability, 10);
                                } catch (e) { }
                                setSelectedZone(parsed);
                            }
                        }}
                        activeZone={selectedZone}
                        evacuationRoute={evacuationRoute}
                        simulatedZones={simulatedZones}
                        hospitals={hospitals}
                    />

                    {/* Legend */}
                    <div className="absolute top-3 right-3 glass-panel p-2.5 text-[10px] z-10 w-32 rounded-lg">
                        <p className="font-semibold mb-2 uppercase text-slate-500 tracking-widest text-[9px]">Map Legend</p>
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-brand-green"></div><span className="text-slate-400">Low</span></div>
                            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-brand-yellow"></div><span className="text-slate-400">Moderate</span></div>
                            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-brand-orange"></div><span className="text-slate-400">High</span></div>
                            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-brand-red"></div><span className="text-slate-400">Critical</span></div>
                            <div className="flex items-center gap-2"><span>🏥</span><span className="text-slate-400">Hospital</span></div>
                            <div className="flex items-center gap-2"><div className="w-3 h-0.5 bg-brand-green rounded"></div><span className="text-slate-400">Evac Route</span></div>
                        </div>
                    </div>

                    {/* Heatmap legend */}
                    {selectedZone && (
                        <div className="absolute bottom-3 right-3 glass-panel p-2 z-10 rounded-lg">
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Flood Intensity</p>
                            <div className="heatmap-gradient h-2 w-20 rounded-full"></div>
                            <div className="flex justify-between text-[8px] text-slate-500 mt-0.5">
                                <span>Low</span><span>High</span>
                            </div>
                        </div>
                    )}

                    {/* Replay mode indicator */}
                    {selectedZone && (
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 glass-panel px-4 py-2 rounded-full border border-brand-amber/30 bg-brand-amber/5">
                            <span className="text-[10px] text-brand-amber font-bold uppercase tracking-widest">📅 HISTORICAL REPLAY</span>
                        </div>
                    )}

                    {/* FLOOD HISTORY VIEWER SLIDER */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-[80%] max-w-2xl px-6 py-4 glass-panel border border-slate-700/40 shadow-[0_20px_50px_rgba(0,0,0,0.6)] animate-fade-in-up">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="w-3.5 h-3.5 text-brand-amber" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Flood History Viewer</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-brand-green animate-pulse shadow-[0_0_8px_#22c55e]"></span>
                                <span className="text-[10px] font-bold text-brand-green uppercase tracking-widest">Live Data</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 group">
                            <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-300 transition-colors">2005</span>
                            <div className="flex-1 relative h-6 flex items-center">
                                <div className="absolute inset-0 bg-slate-800/50 rounded-full border border-slate-700/30 overflow-hidden">
                                    <div
                                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-brand-amber/40 to-brand-amber animate-shimmer"
                                        style={{ width: `${((parseInt(histDate?.split('-')[0] || 2024) - 2005) / (2024 - 2005)) * 100}%` }}
                                    ></div>
                                </div>
                                <input
                                    type="range"
                                    min="2005"
                                    max="2024"
                                    value={histDate?.split('-')[0] || 2024}
                                    onChange={(e) => {
                                        const year = e.target.value;
                                        setHistDate(`${year}-01-01`);
                                        if (histLocation) runHistoricalReplay(`${year}-01-01`, histLocation);
                                    }}
                                    className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                                />
                                <div
                                    className="absolute h-4 w-4 bg-brand-amber rounded-full shadow-[0_0_15px_#f59e0b] cursor-pointer pointer-events-none border-2 border-white transition-all"
                                    style={{ left: `calc(${((parseInt(histDate?.split('-')[0] || 2024) - 2005) / (2024 - 2005)) * 100}% - 8px)` }}
                                ></div>
                            </div>
                            <span className="text-[11px] font-bold text-white tracking-wider">2024</span>
                        </div>
                    </div>
                </div>

                {/* Right — Logs + Charts */}
                <div className="lg:col-span-3 flex flex-col gap-3 z-10 lg:h-full lg:overflow-y-auto pl-0 lg:pl-1 custom-scrollbar">
                    {/* Replay Log */}
                    <div className="glass-panel p-4 border-t-2 border-t-brand-amber">
                        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-brand-amber mb-3 flex items-center gap-2">
                            <ShieldAlert className="h-3.5 w-3.5" /> Replay Log
                        </h2>
                        <div className="space-y-2">
                            {replayLog.length === 0 ? (
                                <p className="text-slate-600 text-xs text-center py-4">No replay events yet. Select a date above to begin.</p>
                            ) : replayLog.map((log) => (
                                <div key={log.id} className={`p-2.5 rounded-lg border text-xs transition-all ${log.level === 'CRITICAL' ? 'bg-brand-red/5 border-brand-red/20' : 'bg-brand-amber/5 border-brand-amber/20'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${log.level === 'CRITICAL' ? 'text-brand-red' : 'text-brand-amber'}`}>{log.level}</span>
                                        <span className="text-[9px] text-slate-500 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {log.time}</span>
                                    </div>
                                    <p className="text-slate-300">{log.msg}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Analytics */}
                    <div className="glass-panel p-4 flex-1">
                        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
                            <BarChart3 className="h-3.5 w-3.5 text-brand-amber" /> Replay Analytics
                        </h2>
                        <div className="flex-1 flex flex-col gap-2 relative z-20">
                            <AnalyticsChart type="rainfall" simulationMode={!!selectedZone} coordinates={selectedZone?.center} />
                            <div className="h-px w-full bg-slate-700/20"></div>
                            <AnalyticsChart type="spread" simulationMode={!!selectedZone} coordinates={selectedZone?.center} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
