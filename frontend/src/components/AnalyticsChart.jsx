import React, { useState, useEffect } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Legend
} from 'recharts';

export default function AnalyticsChart({ type = 'rainfall', simulationMode = false, coordinates = null }) {
    const [realRainfall, setRealRainfall] = useState([]);

    useEffect(() => {
        if (type === 'rainfall' && coordinates && !simulationMode) {
            // Fetch real weather data from Open-Meteo
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coordinates[1]}&longitude=${coordinates[0]}&hourly=precipitation&forecast_days=2`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.hourly && data.hourly.precipitation) {
                        const formatted = data.hourly.time.filter((_, idx) => idx % 6 === 0).slice(0, 8).map((timeStr, idx) => ({
                            time: `+${idx * 6}h`,
                            amount: data.hourly.precipitation[idx * 6] || 0
                        }));
                        setRealRainfall(formatted);
                    }
                })
                .catch(err => console.error("Weather API failed", err));
        }
    }, [coordinates, type, simulationMode]);

    // Define data sets
    let rainfallData = [];
    if (simulationMode) {
        rainfallData = [
            { time: "0h", amount: 45 },
            { time: "12h", amount: 70 },
            { time: "24h", amount: 95 },
            { time: "36h", amount: 50 },
            { time: "48h", amount: 40 },
        ];
    } else if (realRainfall.length > 0) {
        rainfallData = realRainfall;
    } else {
        rainfallData = [
            { time: "0h", amount: 0 },
            { time: "12h", amount: 0 },
            { time: "24h", amount: 0 },
            { time: "36h", amount: 0 },
            { time: "48h", amount: 0 },
        ];
    }

    const spreadData = [
        { time: "0h", area: 5 },
        { time: "12h", area: 15 },
        { time: "24h", area: 28 },
        { time: "36h", area: 35 },
        { time: "48h", area: 30 },
    ];

    if (type === 'rainfall') {
        return (
            <div className="h-40 w-full mt-2">
                <h3 className="text-[10px] text-slate-400 uppercase tracking-widest mb-2 flex justify-between">
                    <span>Rainfall Forecast (Next 48h)</span>
                    {coordinates && !simulationMode && <span className="text-brand-green font-bold">LIVE (Open-Meteo)</span>}
                    {simulationMode && <span className="text-brand-red font-bold animate-pulse">SIMULATED</span>}
                </h3>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={rainfallData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px' }}
                            itemStyle={{ color: '#60a5fa' }}
                        />
                        <Area type="monotone" dataKey="amount" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAmount)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        );
    }

    return (
        <div className="h-40 w-full mt-2">
            <h3 className="text-[10px] text-slate-400 uppercase tracking-widest mb-2 flex justify-between">
                <span>Flood Spread Timeline (km²)</span>
            </h3>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={spreadData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px' }}
                        itemStyle={{ color: '#ef4444' }}
                    />
                    <Line type="monotone" dataKey="area" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
