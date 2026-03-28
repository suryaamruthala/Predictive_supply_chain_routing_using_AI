import React, { useState } from 'react';
import { MapContainer, TileLayer, Circle, Tooltip, Marker } from 'react-leaflet';
import L from 'leaflet';
import { ChevronLeft, ChevronRight, AlertTriangle, CloudDrizzle, Navigation, CheckCircle2, PlayCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { MapFocuser } from '../../../utils/mapUtils';

const AdminOverview = ({ 
    shipments, 
    heatmapZones, 
    allAlerts, 
    highRiskCount, 
    currentShip, 
    isAiPaused, 
    handleSimulateStorm, 
    handleRouteChange, 
    togglePauseAi, 
    setActiveTab, 
    logs,
    maxW,
    maxG,
    maxT
}) => {
    const [isFollowing, setIsFollowing] = useState(true);

    return (
        <div className="flex-1 flex flex-col gap-5 overflow-hidden">
            {/* === KPI ROW === */}
            <div className="flex gap-5 h-[50px] shrink-0">
                <div className="flex-1 bg-[#1A1D27] rounded-md border border-[#262A38] flex items-center justify-between px-6 shadow-md">
                    <span className="text-sm font-medium text-gray-400">Active Shipments:</span>
                    <span className="text-xl font-bold text-[#4CAF50]">{shipments.length || 25}</span>
                </div>
                <div className="flex-1 bg-[#1A1D27] rounded-md border border-[#262A38] flex items-center justify-between px-6 shadow-md">
                    <span className="text-sm font-medium text-gray-400">High Risk Zones:</span>
                    <span className="text-xl font-bold text-[#F44336]">{highRiskCount}</span>
                </div>
                <div className="flex-1 bg-[#1A1D27] rounded-md border border-[#262A38] flex items-center justify-between px-6 shadow-md">
                    <span className="text-sm font-medium text-gray-400">Alerts:</span>
                    <span className="text-xl font-bold text-[#FF9800]">{allAlerts.length}</span>
                </div>
                <div className="flex-1 bg-[#1A1D27] rounded-md border border-[#262A38] flex items-center justify-between px-6 shadow-md">
                    <span className="text-sm font-medium text-gray-400">Avg. Delay:</span>
                    <span className="text-xl font-bold text-[#FF9800]">2.5 hrs</span>
                </div>
            </div>

            {/* === MIDDLE ROW (Map & Alerts) === */}
            <div className="flex gap-5 flex-1 min-h-[400px] overflow-hidden">
                {/* Map Container - 75% */}
                <div className="w-[75%] bg-[#1A1D27] rounded-lg border border-[#262A38] overflow-hidden shadow-xl relative">
                    <MapContainer center={[20.0, 60.0]} zoom={3} style={{ width: '100%', height: '100%' }} zoomControl={false}>
                        <TileLayer 
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
                            className="saturate-50 contrast-125 brightness-75 hue-rotate-15"
                        />
                        <MapFocuser isFollowing={isFollowing} setIsFollowing={setIsFollowing} center={currentShip ? [currentShip.currentLat, currentShip.currentLng] : null} targetId={currentShip?.id} zoom={4} />
                        {heatmapZones.map((zone) => (
                            <Circle key={`z-${zone.id}`} center={[zone.lat, zone.lng]} pathOptions={{ fillColor: zone.intensity > 60 ? '#F44336' : '#FF9800', color: zone.intensity > 60 ? '#F44336' : '#FF9800' }} radius={zone.radius_km * 1000} stroke={false} fillOpacity={0.4}>
                                <Tooltip direction="top" opacity={1} permanent className="bg-[#F44336] border-none text-white text-xs font-bold rounded shadow-lg">
                                    {zone.type}
                                    <div className="text-[9px] uppercase tracking-wider block border-t border-white/20 mt-1 pt-1 opacity-90">High Risk</div>
                                </Tooltip>
                            </Circle>
                        ))}
                        {shipments.map(s => s.currentLat && s.currentLng && (
                            <Marker key={`shp-${s.id}`} position={[s.currentLat, s.currentLng]} icon={new L.DivIcon({ className: 'custom-icon', html: `<div class="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-lg cursor-pointer transition-transform hover:scale-125"></div>`})} eventHandlers={{ click: () => toast.success(`Ship ${s.id} Selected`) }} />
                        ))}
                    </MapContainer>
                </div>
                
                {/* Recent Alerts - 25% */}
                <div className="w-[25%] bg-[#1A1D27] rounded-lg border border-[#262A38] shadow-xl p-5 flex flex-col">
                    <div className="flex justify-between items-center mb-5 border-b border-[#2A2E3E] pb-3">
                        <h3 className="font-semibold text-gray-200">Recent Alerts</h3>
                        <div className="flex gap-2 text-gray-500">
                            <ChevronLeft className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
                            <ChevronRight className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-5 pr-2 custom-scrollbar">
                        {allAlerts.length > 0 ? allAlerts.map((alt, idx) => (
                            <div key={idx} className="flex gap-3 items-start cursor-pointer hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors" onClick={() => toast(`Target: ${alt.cargo}`)}>
                                <div className="mt-1"><AlertTriangle className="w-4 h-4 text-[#FF9800]" fill="currentColor" fillOpacity={0.2}/></div>
                                <div className="flex-1">
                                    <p className="text-[#FF9800] text-xs font-semibold uppercase tracking-wider mb-0.5">Alert</p>
                                    <p className="text-sm font-medium text-gray-300">{alt.msg}</p>
                                </div>
                            </div>
                        )).slice(0, 5) : (
                            <div className="text-xs text-gray-500 italic text-center mt-4">No recent immediate alerts.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* === BOTTOM DIAGNOSTICS ROW === */}
            <div className="flex gap-5 h-[200px] shrink-0">
                <div className="flex-1 bg-[#1A1D27] rounded-lg border border-[#262A38] p-5 flex flex-col shadow-xl">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-gray-200 font-semibold text-[15px]">Active Focus Target</h3>
                        <button onClick={() => setActiveTab('SHIPMENTS')} className="text-blue-400 hover:text-blue-300 text-xs font-medium">View All</button>
                    </div>
                    <div className="space-y-2.5 text-sm flex-1">
                        {currentShip ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Target ID:</span>
                                    <span className="text-blue-400 font-mono text-[13px] border-b border-blue-500/30 cursor-pointer" onClick={() => {navigator.clipboard.writeText(currentShip.id); toast.success('Copied: ' + currentShip.id)}}>#{currentShip.id.toString().slice(-6)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Cargo:</span>
                                    <span className="text-gray-200 font-bold truncate max-w-[150px]">{currentShip.name}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Position:</span>
                                    <span className="text-cyan-400 font-mono text-[11px] italic leading-none bg-cyan-500/5 px-2 py-1 rounded">
                                        {currentShip.currentLat?.toFixed(4)}°, {currentShip.currentLng?.toFixed(4)}°
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Emissions:</span>
                                    <span className="text-green-400 font-mono text-[11px]">{currentShip.carbonEmissions?.toFixed(2) || '0.00'} <span className="text-[9px] opacity-60">KG</span></span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">ETA:</span>
                                    <span className="text-yellow-400 font-bold text-[11px] uppercase italic">
                                        {currentShip.estimatedDelivery ? new Date(currentShip.estimatedDelivery).toLocaleDateString() : 'CALCULATING...'}
                                    </span>
                                </div>
                                <div className="pt-2 border-t border-[#262A38] mt-2">
                                     <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Risk Level:</span>
                                        <span className={`text-[11px] font-black ${currentShip.riskScore > 50 ? 'text-red-500' : 'text-green-500'}`}>{currentShip.riskScore}%</span>
                                     </div>
                                     <div className="w-full h-1 bg-[#262A38] rounded-full overflow-hidden">
                                        <div className={`h-full transition-all duration-1000 ${currentShip.riskScore > 50 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-green-500'}`} style={{ width: `${currentShip.riskScore}%` }}></div>
                                     </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 mt-4 text-xs italic">No active dispatch available.</div>
                        )}
                    </div>
                </div>
                
                <div className="flex-1 bg-[#1A1D27] rounded-lg border border-[#262A38] p-5 flex flex-col shadow-xl">
                    <h3 className="text-gray-200 font-semibold mb-5 text-[15px]">Risk Summary</h3>
                    <div className="flex flex-col gap-4 flex-1 justify-center">
                        <div className="relative h-7 w-full bg-[#FF9800]/20 rounded overflow-hidden flex items-center justify-between px-3 border border-[#FF9800]/30 shadow-inner group">
                            <div className="absolute left-0 top-0 bottom-0 bg-[#FF9800]/80 rounded-r z-0 transition-all duration-1000 group-hover:bg-[#FF9800]" style={{width: `${Math.max(20, maxW)}%`}}></div>
                            <span className="relative z-10 text-xs text-white font-medium drop-shadow-md cursor-help" onClick={() => toast('Global baseline meteorological risk metrics.')}>Weather Instability</span>
                            {maxW > 80 && <span className="relative z-10 text-[10px] font-bold text-white bg-red-900/80 px-2 py-0.5 rounded shadow">CRITICAL</span>}
                        </div>
                        <div className="relative h-7 w-full bg-[#F44336]/20 rounded overflow-hidden flex items-center justify-between px-3 border border-[#F44336]/30 shadow-inner group">
                            <div className="absolute left-0 top-0 bottom-0 bg-[#F44336]/80 rounded-r z-0 transition-all duration-1000 group-hover:bg-[#F44336]" style={{width: `${Math.max(20, maxG)}%`}}></div>
                            <span className="relative z-10 text-xs text-white font-medium drop-shadow-md cursor-help" onClick={() => toast('Geopolitical friction analysis levels.')}>Geopolitical Threat Levels</span>
                            {maxG > 60 && <span className="relative z-10 text-[10px] font-bold text-white bg-black/30 px-2 py-0.5 rounded shadow">HIGH</span>}
                        </div>
                        <div className="relative h-7 w-full bg-[#FFB300]/20 rounded overflow-hidden flex items-center px-3 border border-[#FFB300]/30 shadow-inner group">
                            <div className="absolute left-0 top-0 bottom-0 bg-[#FFB300]/80 rounded-r z-0 transition-all duration-1000 group-hover:bg-[#FFB300]" style={{width: `${Math.max(10, maxT)}%`}}></div>
                            <span className="relative z-10 text-xs text-white font-medium drop-shadow-md cursor-help" onClick={() => toast('Traffic routing efficiency coefficient.')}>Traffic Congestion Alerts</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 bg-[#1A1D27] rounded-lg border border-[#262A38] p-5 flex flex-col shadow-xl relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-4 relative z-10">
                        <div className={`w-2 h-2 rounded-full ${isAiPaused ? 'bg-red-500' : 'bg-green-500 animate-pulse'} shadow-md`}></div>
                        <h3 className="text-gray-200 font-semibold text-[15px]">AI Telemetry Control</h3>
                    </div>
                    <div className="flex flex-col gap-3 flex-1 relative z-10">
                        <button onClick={handleSimulateStorm} className="flex-1 bg-[#2C3B5E] hover:bg-[#324570] text-blue-300 font-medium text-sm rounded shadow-[0_4px_10px_rgba(0,0,0,0.3)] shadow-blue-500/10 border border-blue-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                            <CloudDrizzle className="w-4 h-4" /> Inject Storm Anomaly
                        </button>
                        <button onClick={handleRouteChange} className="flex-1 bg-[#242A38] hover:bg-[#2C3345] text-gray-300 font-medium text-sm rounded shadow-[0_4px_10px_rgba(0,0,0,0.2)] border border-[#3A435A] transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                            <Navigation className="w-4 h-4" /> Execute Auto-Reroute
                        </button>
                        <button onClick={togglePauseAi} className={`flex-1 font-medium text-sm rounded shadow-[0_4px_10px_rgba(0,0,0,0.2)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${isAiPaused ? 'bg-[#3A2222] border-[#E44B4B]/30 text-[#E44B4B] hover:bg-[#4A2222]' : 'bg-[#242A38] hover:bg-[#2C3345] border-[#3A435A] text-gray-300 hover:text-white'}`}>
                            {isAiPaused ? <CheckCircle2 className="w-4 h-4"/> : <PlayCircle className="w-4 h-4"/>} 
                            {isAiPaused ? 'Resume Master Stream' : 'Halt Processing Input'}
                        </button>
                    </div>
                </div>
            </div>

            {/* === COMPREHENSIVE SIMULATOR CONSOLE === */}
            <div className="h-[180px] shrink-0 bg-[#0D0F16] border border-[#262A38] rounded-xl flex flex-col overflow-hidden shadow-2xl relative mt-1">
                <div className="h-8 bg-[#181A25] border-b border-[#262A38] flex items-center px-4 justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#E44B4B]"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-[#FF9800]"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-[#31A25B]"></div>
                    </div>
                    <span className="text-[10px] font-mono text-gray-500 tracking-widest uppercase font-bold">Command Terminal // Simulator Logs</span>
                    <div className="w-10"></div>
                </div>
                <div className="flex-1 p-4 font-mono text-[12px] text-[#4CAF50] overflow-y-auto custom-scrollbar flex flex-col justify-end">
                    {logs.map((log, idx) => (
                        <div key={idx} className="leading-relaxed opacity-90 break-words">{log}</div>
                    ))}
                    <div className="leading-relaxed text-[#4CAF50] animate-pulse">_</div>
                </div>
            </div>
        </div>
    );
};

export default AdminOverview;
