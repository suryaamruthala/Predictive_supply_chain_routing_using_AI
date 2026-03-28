import React from 'react';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Search } from 'lucide-react';
import { MapFocuser } from '../../../utils/mapUtils';

const UserRiskPortal = ({ 
    searchQuery, 
    setSearchQuery, 
    handleGlobalSearch, 
    targetLocation, 
    calculatedRisk, 
    riskDetails, 
    isFollowing, 
    setIsFollowing, 
    heatmapZones 
}) => {
    return (
        <div className="h-full relative overflow-hidden flex flex-col">
            <div className="absolute top-10 right-10 z-[1010] w-[300px]">
                <form onSubmit={(e) => { e.preventDefault(); handleGlobalSearch(searchQuery); }} className="relative flex items-center bg-[#1e293b]/95 backdrop-blur-3xl border border-white/10 rounded-2xl px-4 h-12 shadow-2xl overflow-hidden">
                    <Search className="w-4 h-4 text-slate-500 mr-3"/>
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="SEARCH VILLAGE..." className="bg-transparent border-none outline-none text-white text-[11px] font-bold placeholder-slate-600 flex-1 uppercase tracking-tight" />
                </form>
            </div>
            {targetLocation && calculatedRisk && riskDetails && (
                <div className="absolute top-36 right-10 z-[1010] w-[340px] animate-in slide-in-from-right-10 duration-700 bg-[#1e293b]/98 backdrop-blur-3xl border border-slate-700 rounded-[30px] p-8 shadow-3xl">
                    <h3 className="text-xl font-black text-white italic tracking-tighter uppercase mb-6 line-clamp-1">{targetLocation.name}</h3>
                    <div className="flex flex-col items-center mb-8">
                        <div className="relative w-36 h-36 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-[6px] border-slate-800" />
                            <div className={`absolute inset-0 rounded-full border-[6px] border-transparent border-t-red-500 animate-spin-slow`} />
                            <span className="text-4xl font-mono font-black italic text-red-500">{calculatedRisk}%</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="p-4 bg-white/5 rounded-2xl flex justify-between uppercase font-bold text-[10px] text-slate-400"><span>Stability</span><span className="text-white">{riskDetails.stability}</span></div>
                        <div className="p-4 bg-white/5 rounded-2xl flex justify-between uppercase font-bold text-[10px] text-slate-400"><span>Meteorological</span><span className="text-white">{riskDetails.meteorological}</span></div>
                        <p className="text-[10px] text-blue-400 italic border-l border-blue-500 pl-4">{riskDetails.description}</p>
                    </div>
                </div>
            )}
            <div className="flex-1 rounded-3xl overflow-hidden border border-slate-800 relative">
                <MapContainer center={[20, 40]} zoom={3} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" className="contrast-110 brightness-75 grayscale-[20%]" />
                    <MapFocuser center={targetLocation ? [targetLocation.lat, targetLocation.lng] : null} isFollowing={isFollowing} setIsFollowing={setIsFollowing} targetId={targetLocation ? targetLocation.name : null} zoom={targetLocation ? 10 : 3} />
                    {heatmapZones.map(z => (
                        <Circle key={z.id} center={[z.lat, z.lng]} radius={z.radius_km * 1000} pathOptions={{ fillColor: z.type === 'WAR' ? '#ef4444' : '#3b82f6', color: 'transparent', fillOpacity: 0.35 }} />
                    ))}
                    {targetLocation && (
                        <Marker position={[targetLocation.lat, targetLocation.lng]} icon={new L.DivIcon({ className: 'ping', html: `<div class="w-10 h-10 border-2 border-blue-500 rounded-full animate-ping"></div>` })} />
                    )}
                </MapContainer>
            </div>
        </div>
    );
};

export default UserRiskPortal;
