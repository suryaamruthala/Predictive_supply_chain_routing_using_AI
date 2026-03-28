import React from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { Truck, Crosshair } from 'lucide-react';
import { MapFocuser } from '../../../utils/mapUtils';

const UserTrackingMap = ({ 
    shipments, 
    selectedShip, 
    selectedShipId, 
    setSelectedShipId, 
    isFollowing, 
    setIsFollowing 
}) => {
    return (
        <div className="h-full relative overflow-hidden flex flex-col">
             <MapContainer center={[20, 30]} zoom={3} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" className="contrast-110 brightness-50" />
                <MapFocuser center={selectedShip ? [selectedShip.currentLat, selectedShip.currentLng] : null} isFollowing={isFollowing} setIsFollowing={setIsFollowing} targetId={selectedShipId} />
                {shipments.map(s => (
                    <Marker key={s.id} position={[s.currentLat, s.currentLng]} eventHandlers={{ click: () => { setSelectedShipId(s.id); setIsFollowing(true); } }} icon={new L.DivIcon({ className: 'custom-ship-marker', html: `<div class="relative w-4 h-4 bg-${s.riskScore > 70 ? 'red-500' : 'blue-600'} rounded-full border-2 border-white animate-pulse shadow-glow"></div>` })} />
                ))}
            </MapContainer>
            {selectedShip && (
                <div className="absolute inset-x-6 bottom-6 z-[1000] animate-in slide-in-from-bottom-5 duration-500">
                    <div className="bg-[#1e293b]/98 backdrop-blur-3xl border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between shadow-2xl overflow-hidden min-h-[90px]">
                        <div className="flex items-center gap-6 shrink-0 max-w-[35%] overflow-hidden">
                            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shrink-0">
                                <Truck className="w-8 h-8 text-white" />
                            </div>
                            <div className="overflow-hidden">
                                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter truncate">{selectedShip.origin} → {selectedShip.destination}</h3>
                                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1.5 truncate max-w-[200px]">
                                    {selectedShip.name} // <span className="text-slate-400 font-mono italic">{selectedShip.currentLat?.toFixed(4)}, {selectedShip.currentLng?.toFixed(4)}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-1 justify-center items-center gap-12 mx-6 border-x border-slate-800/50 px-6 font-mono font-black italic text-xl">
                            <div className="text-center">
                                <p className="text-[9px] text-slate-500 font-bold uppercase mb-0.5 tracking-tighter">Velocity</p>
                                <p className="text-blue-400">65 <span className="text-[10px] opacity-50">KM/H</span></p>
                            </div>
                            <div className="text-center">
                                <p className="text-[9px] text-cyan-500 font-bold uppercase mb-0.5 tracking-tighter">Carbon Footprint</p>
                                <p className="text-cyan-400">{selectedShip.carbonEmissions?.toFixed(2) || '0.00'} <span className="text-[10px] opacity-50">KG</span></p>
                            </div>
                            <div className="text-center">
                                <p className="text-[9px] text-orange-500 font-bold uppercase mb-0.5 tracking-tighter">Risk Vector</p>
                                <p className={selectedShip.riskScore > 50 ? 'text-red-500' : 'text-green-500'}>{selectedShip.riskScore}%</p>
                            </div>
                        </div>
                        <button onClick={() => setIsFollowing(!isFollowing)} className={`h-12 px-8 rounded-xl ${isFollowing ? 'bg-blue-600 shadow-glow animate-pulse' : 'bg-slate-800 border border-slate-700 hover:bg-slate-700'} text-white font-black text-[10px] tracking-[0.2em] uppercase flex items-center gap-2 transition-all`}>
                            <Crosshair className="w-4 h-4" /> {isFollowing ? 'LATCHED' : 'ENGAGE HUD'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserTrackingMap;
