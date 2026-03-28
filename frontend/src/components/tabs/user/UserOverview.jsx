import React, { useState, useEffect } from 'react';
import { 
  Activity, ShieldAlert, Zap, List, 
  MapPin, Cloud, Timer, TrendingUp,
  Box, Anchor
} from 'lucide-react';

const UserOverview = ({ shipments, setActiveTab, setSelectedShipId, setIsFollowing }) => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsMounted(true), 150);
        return () => clearTimeout(timer);
    }, []);

    // Derived Analytics
    const totalUnits = shipments.length;
    const avgRisk = shipments.length > 0 ? (shipments.reduce((a, s) => a + (s.riskScore || 0), 0) / shipments.length).toFixed(1) : '0.0';
    const carbonTotal = shipments.reduce((a, s) => a + (s.carbonEmissions || 0), 0).toFixed(2);
    const reroutedCount = shipments.filter(s => s.isRerouted).length;

    // Mode Distribution (Placeholders for visualization)
    const modes = [
        { label: 'Maritime', count: Math.ceil(totalUnits * 0.4), color: 'bg-blue-600' },
        { label: 'Aerial', count: Math.ceil(totalUnits * 0.2), color: 'bg-cyan-400' },
        { label: 'Terrestrial', count: Math.ceil(totalUnits * 0.4), color: 'bg-green-500' }
    ];

    return (
        <div className="p-10 max-w-[1600px] mx-auto space-y-10 animate-in fade-in duration-700">
            
            {/* --- HERO KPI STRIP --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Active Fleet Units', value: totalUnits, icon: <Box className="w-5 h-5 text-blue-500"/>, trend: '+2.4%' },
                    { label: 'Aggregate Risk Baseline', value: `${avgRisk}%`, icon: <ShieldAlert className="w-5 h-5 text-red-500"/>, trend: '-0.8%' },
                    { label: 'Carbon Offset Metric', value: `${carbonTotal} kg`, icon: <Cloud className="w-5 h-5 text-cyan-400"/>, trend: 'Optimal' },
                    { label: 'Neural Stability Index', value: '99.4%', icon: <Zap className="w-5 h-5 text-yellow-400"/>, trend: 'LOCKED' }
                ].map((kpi, i) => (
                    <div key={i} className="bg-[#1e293b]/50 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-xl hover:border-blue-500/30 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-slate-900/50 rounded-2xl group-hover:bg-blue-600/10 transition-colors">{kpi.icon}</div>
                            <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${kpi.trend.includes('-') ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>{kpi.trend}</span>
                        </div>
                        <h3 className="text-3xl font-black text-white italic tracking-tighter mb-1">{kpi.value}</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">{kpi.label}</p>
                    </div>
                ))}
            </div>

            {/* --- CORE ANALYTICS HUB --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Distribution Chart */}
                <div className="lg:col-span-2 bg-[#1e293b]/50 backdrop-blur-xl border border-slate-800 rounded-[32px] p-8 shadow-2xl">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Deployment Vectors</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Multi-Modal Logistics Distribution</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-6 flex-1 min-h-[200px] w-full mt-4 place-items-center">
                        {modes.map((m, i) => {
                            const total = Math.max(...modes.map(x=>x.count), 1);
                            const percent = (m.count / total) * 100;
                            const radius = 40;
                            const circumference = 2 * Math.PI * radius;
                            const strokeDashoffset = isMounted ? circumference - (percent / 100) * circumference : circumference;
                            
                            // Map tailwind bg colors to raw stroke colors
                            const strokeColor = m.color.includes('blue') ? '#2563eb' : m.color.includes('cyan') ? '#22d3ee' : '#22c55e';

                            return (
                                <div key={i} className="flex flex-col items-center gap-6 group">
                                    <div className="relative w-32 h-32 flex items-center justify-center">
                                        {/* Background Ring */}
                                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                                            <circle cx="64" cy="64" r={radius} stroke="#1e293b" strokeWidth="8" fill="transparent" />
                                            {/* Foreground Ring */}
                                            <circle 
                                                cx="64" cy="64" r={radius} 
                                                stroke={strokeColor} 
                                                strokeWidth="8" fill="transparent"
                                                strokeLinecap="round"
                                                strokeDasharray={circumference}
                                                strokeDashoffset={strokeDashoffset}
                                                className="transition-all duration-[1500ms] ease-out drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                            <p className="text-2xl font-black text-white italic leading-none">{m.count}</p>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[11px] font-black text-white uppercase tracking-widest">{m.label}</p>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Fleet Units</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* AI Reroute Alert List */}
                <div className="bg-[#1e293b]/80 backdrop-blur-3xl border border-slate-800 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5"><TrendingUp className="w-32 h-32"/></div>
                    <h3 className="text-xl font-black text-white italic uppercase tracking-tight mb-8">Neural Activity</h3>
                    <div className="space-y-6">
                        {shipments.filter(s => s.isRerouted).slice(0, 4).length > 0 ? (
                            shipments.filter(s => s.isRerouted).slice(0, 4).map((s, i) => (
                                <div key={i} className="flex gap-4 items-start border-l-2 border-orange-500 pl-4 py-1">
                                    <div className="flex-1">
                                        <p className="text-[11px] font-black text-white uppercase italic tracking-tight">{s.name}</p>
                                        <p className="text-[9px] text-orange-400 font-bold uppercase tracking-widest mt-0.5">Vector Re-routed // Low Latency Path</p>
                                    </div>
                                    <span className="text-[9px] text-slate-500 font-mono italic">JUST NOW</span>
                                </div>
                            ))
                        ) : (
                            <div className="py-10 text-center text-slate-600 text-[10px] font-bold uppercase tracking-widest italic border border-dashed border-slate-700 rounded-2xl">
                                All Paths Optimized <br/> Neural Engine Calm
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* --- TELEMETRY REGISTRY (TABLE) --- */}
            <div className="bg-[#1e293b]/80 backdrop-blur-3xl border border-slate-800 rounded-[32px] overflow-hidden shadow-3xl">
                <div className="px-10 py-8 border-b border-slate-800 bg-slate-900/30 flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
                            <List className="w-6 h-6 text-blue-600" /> Live Telemetry Registry
                        </h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Real-time Global Vector Synchronization</p>
                    </div>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-900/50 text-[10px] font-black text-slate-500 uppercase h-14 tracking-widest">
                                <th className="px-10">Unit Dispatch</th>
                                <th className="px-6 text-center">POSITION (LAT/LONG)</th>
                                <th className="px-6 text-center">STATUS VECTOR</th>
                                <th className="px-6 text-center">ECO-INDEX (CARBON)</th>
                                <th className="px-6 text-center">EST. DELIVER</th>
                                <th className="px-10 text-right">RISK VALUE (%)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {shipments.map(s => (
                                <tr key={s.id} onClick={() => { setActiveTab('TRACKING'); setSelectedShipId(s.id); setIsFollowing(true); }} className="hover:bg-blue-600/5 cursor-pointer transition-all group border-l-4 border-transparent hover:border-blue-600">
                                    <td className="px-10 py-6">
                                        <p className="text-white font-black italic uppercase tracking-tight text-lg group-hover:text-blue-400 transition-colors">{s.name}</p>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{s.origin} → {s.destination}</p>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <div className="bg-slate-900/50 rounded-xl px-4 py-2 border border-slate-800 inline-block font-mono text-[11px] text-blue-400 italic">
                                            {s.currentLat?.toFixed(4)}, {s.currentLng?.toFixed(4)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase italic shadow-sm border ${s.status === 'DELAYED' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-green-500/10 text-green-400 border-green-500/30'}`}>
                                            {s.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-6 text-center text-cyan-400 font-mono font-black italic">
                                        {s.carbonEmissions ? s.carbonEmissions.toFixed(2) : '0.00'} <span className="text-[10px] text-slate-600">KG</span>
                                    </td>
                                    <td className="px-6 py-6 text-center text-slate-400 font-bold text-[11px] uppercase tracking-widest italic">
                                        {s.estimatedDelivery ? new Date(s.estimatedDelivery).toLocaleDateString() : 'STABLE'}
                                    </td>
                                    <td className="px-10 py-6 text-right font-mono font-black italic text-xl">
                                        <span className={s.riskScore > 70 ? 'text-red-500' : 'text-blue-500'}>{s.riskScore}%</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserOverview;
