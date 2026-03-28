import React from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Sparkles, Zap, Loader2 } from 'lucide-react';
import { MapFocuser } from '../../../utils/mapUtils';

const UserRouteStrategist = ({ 
    sourceQuery, 
    setSourceQuery, 
    destQuery, 
    setDestQuery, 
    handleRouteSearch, 
    isRouting, 
    routeSource, 
    routeDest, 
    routeData, 
    midways, 
    isFollowing, 
    setIsFollowing 
}) => {
    return (
        <div className="h-full relative overflow-hidden flex flex-col">
            <div className="absolute top-10 left-10 z-[1010] w-[320px]">
                <form onSubmit={handleRouteSearch} className="bg-[#1e293b]/95 backdrop-blur-3xl border border-slate-800 rounded-3xl p-6 shadow-3xl space-y-3">
                    <h4 className="text-[10px] text-blue-500 font-bold uppercase tracking-[0.3em] mb-3"><Sparkles className="w-4 h-4 inline mr-3"/> Vector Synthesis</h4>
                    <input type="text" value={sourceQuery} onChange={e => setSourceQuery(e.target.value)} placeholder="SOURCE..." className="w-full h-11 bg-slate-900/50 border border-white/5 rounded-xl px-4 text-white text-[11px] font-bold uppercase placeholder-slate-700" />
                    <input type="text" value={destQuery} onChange={e => setDestQuery(e.target.value)} placeholder="DESTINATION..." className="w-full h-11 bg-slate-900/50 border border-white/5 rounded-xl px-4 text-white text-[11px] font-bold uppercase placeholder-slate-700" />
                    <button type="submit" disabled={isRouting} className="w-full h-12 bg-blue-600 rounded-xl text-white font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-500 transition-all flex items-center justify-center gap-2">
                        {isRouting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Zap className="w-4 h-4"/>} GENERATE
                    </button>
                </form>
            </div>

            <div className="flex-1 rounded-3xl overflow-hidden border border-slate-800 relative">
                <MapContainer center={[20, 60]} zoom={3} style={{ height: '100%', width: '100% '}} zoomControl={false}>
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" className="contrast-110 brightness-50" />
                    <MapFocuser isFollowing={isFollowing} setIsFollowing={setIsFollowing} bounds={(routeSource && routeDest) ? L.latLngBounds([[routeSource.lat, routeSource.lng], [routeDest.lat, routeDest.lng]]) : null} targetId={(routeSource && routeDest) ? routeSource.name + routeDest.name : null} />
                    
                    {(routeSource && routeDest && routeData) && (
                        <React.Fragment>
                            <Marker position={[routeSource.lat, routeSource.lng]} icon={new L.DivIcon({ className: 'custom-pin', html: `<div class="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>` })}>
                                <Tooltip permanent direction="bottom" className="tactical-label bg-green-600 border-none text-white text-[10px] font-bold">SOURCE: {routeSource.name}</Tooltip>
                            </Marker>
                            
                            <Marker position={[routeDest.lat, routeDest.lng]} icon={new L.DivIcon({ className: 'custom-pin', html: `<div class="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>` })}>
                                <Tooltip permanent direction="top" className="tactical-label bg-red-600 border-none text-white text-[10px] font-bold">DEST: {routeDest.name}</Tooltip>
                            </Marker>

                            <Polyline positions={[[routeSource.lat, routeSource.lng], [routeDest.lat, routeDest.lng]]} pathOptions={{ color: '#22d3ee', weight: 3, dashArray: '10, 15' }}>
                                <Tooltip permanent direction="top" className="route-tooltip bg-cyan-600 border-none text-white text-[10px] font-bold italic">AIR: ${routeData.air.cost} | {routeData.air.time}h | {routeData.air.risk}%</Tooltip>
                            </Polyline>

                            <Polyline positions={[[routeSource.lat, routeSource.lng], [midways.road.lat, midways.road.lng], [routeDest.lat, routeDest.lng]]} pathOptions={{ color: '#10b981', weight: 4 }}>
                                <Marker position={[midways.road.lat, midways.road.lng]} icon={new L.DivIcon({ className: 'midpin', html: `<div class="w-2 h-2 bg-green-400 rounded-full border border-white"></div>` })}>
                                    <Tooltip direction="top" className="tactical-label bg-slate-800 border-none text-white text-[9px] font-bold">Passing: {midways.road.name}</Tooltip>
                                </Marker>
                                <Tooltip permanent direction="top" className="route-tooltip bg-green-600 border-none text-white text-[10px] font-bold italic">ROAD: ${routeData.road.cost} | {routeData.road.time}h | {routeData.road.risk}%</Tooltip>
                            </Polyline>

                            <Polyline positions={[[routeSource.lat, routeSource.lng], [midways.sea.lat, midways.sea.lng], [routeDest.lat, routeDest.lng]]} pathOptions={{ color: '#2563eb', weight: 4, dashArray: '2, 10' }}>
                                <Marker position={[midways.sea.lat, midways.sea.lng]} icon={new L.DivIcon({ className: 'midpin', html: `<div class="w-2 h-2 bg-blue-400 rounded-full border border-white"></div>` })}>
                                    <Tooltip direction="bottom" className="tactical-label bg-slate-800 border-none text-white text-[9px] font-bold">Maritime Vector: {midways.sea.name}</Tooltip>
                                </Marker>
                                <Tooltip permanent direction="top" className="route-tooltip bg-blue-600 border-none text-white text-[10px] font-bold italic">SEA: ${routeData.sea.cost} | {routeData.sea.time}h | {routeData.sea.risk}%</Tooltip>
                            </Polyline>
                        </React.Fragment>
                    )}
                </MapContainer>
            </div>
        </div>
    );
};

export default UserRouteStrategist;
