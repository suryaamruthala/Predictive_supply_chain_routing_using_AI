import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Menu, Search, TriangleAlert, Briefcase, Package, CheckSquare, XSquare, X, Trash2, RefreshCw, MapPin, ToggleLeft, ToggleRight, AlertOctagon, ShieldAlert, Navigation, Plus, Calendar } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import toast from 'react-hot-toast';
import { exportShipmentPDF } from '../utils/pdfReports';
import { geocodeCity } from '../services/geocoder';
// Removed static CITY_COORDS block in favor of dynamic Nominatim API geocoding

const getStatusColor = (status) => {
    if (!status) return 'bg-gray-600 text-white';
    switch (status.toUpperCase().replace('_', ' ')) {
        case 'IN TRANSIT': return 'bg-[#31A25B] text-white';
        case 'DELAYED': return 'bg-[#DE4141] text-white';
        case 'DELIVERED': return 'bg-[#5EB663] text-white';
        case 'ON HOLD': return 'bg-[#F2A30F] text-white';
        case 'REROUTED': return 'bg-orange-500 text-white';
        default: return 'bg-gray-600 text-white';
    }
};

const normalizeStatus = (status) => status?.replace('_', ' ').toUpperCase() || '';

// Hook component to smoothly recenter map when async coords arrive
const MapUpdater = ({ center }) => {
    const map = useMap();
    React.useEffect(() => {
        if (center) map.setView(center, 5, { animate: true });
    }, [center, map]);
    return null;
};

// Track overlay - fullscreen map displayed over the entire screen
const TrackModal = ({ shipment, onClose }) => {
    const [mlPredictions, setMlPredictions] = useState(null);
    const [loadingMl, setLoadingMl] = useState(false);
    const [heatmapZones, setHeatmapZones] = useState([]);
    const [originCoords, setOriginCoords] = useState(null);
    const [destCoords, setDestCoords] = useState(null);

    React.useEffect(() => {
        const fetchHeatmap = async () => {
            try {
                const res = await axios.get('http://localhost:8000/api/heatmap');
                setHeatmapZones(res.data.zones || []);
            } catch (e) {}
        };
        fetchHeatmap();
        const interval = setInterval(fetchHeatmap, 5000);
        return () => clearInterval(interval);
    }, []);

    React.useEffect(() => {
        const fetchML = async () => {
            if (!shipment.origin || !shipment.destination) return;
            setLoadingMl(true);
            try {
                const res = await axios.post('http://localhost:8000/api/ml-predict', {
                    origin: shipment.origin,
                    destination: shipment.destination
                });
                setMlPredictions(res.data);
            } catch (e) {}
            finally { setLoadingMl(false); }
        };
        fetchML();
        const mlInterval = setInterval(fetchML, 10000);
        return () => clearInterval(mlInterval);
    }, [shipment.origin, shipment.destination]);

    React.useEffect(() => {
        const fetchGeo = async () => {
            const oc = await geocodeCity(shipment.origin);
            if (oc) setOriginCoords(oc);
            const dc = await geocodeCity(shipment.destination);
            if (dc) setDestCoords(dc);
        };
        fetchGeo();
    }, [shipment.origin, shipment.destination]);



    let routePositions = [];
    try {
        if (shipment.activeRoutePolyline) {
            routePositions = JSON.parse(shipment.activeRoutePolyline).map(p => [p.lat, p.lng]);
            let lngAcc = 0;
            for (let i = 1; i < routePositions.length; i++) {
                let prevLng = routePositions[i-1][1];
                let currLng = routePositions[i][1] + lngAcc;
                if (currLng - prevLng > 180) { lngAcc -= 360; currLng -= 360; }
                else if (currLng - prevLng < -180) { lngAcc += 360; currLng += 360; }
                routePositions[i][1] = currLng;
            }
        }
    } catch {}

    const center = originCoords || [20, 78];
    const bestRoute = mlPredictions?.predictions?.find(p => p.recommended);
    const allHighRisk = mlPredictions?.predictions?.length > 0 && mlPredictions.predictions.every(p => p.risk_level === 'CRITICAL' || p.risk_level === 'HIGH' || p.risk_pct > 60);

    return (
        <div className="fixed inset-0 z-[9999]">
            {/* LEGEND */}
            <div className="absolute top-4 left-4 z-[10000]" style={{ background: 'rgba(11,13,20,0.85)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 16px' }}>
                <div style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '0.1em', color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase' }}>Route Legend</div>
                <div className="flex flex-col gap-1.5">
                    {[{ icon: '🚛', label: 'ROAD', color: '#A78BFA' }, { icon: '✈', label: 'AIR', color: '#38BDF8' }, { icon: '🚢', label: 'WATER', color: '#818CF8' }].map(r => (
                        <div key={r.label} className="flex items-center gap-2" style={{ fontSize: '11px', color: '#D1D5DB' }}>
                            <div style={{ width: '20px', height: '2px', backgroundColor: r.color, borderRadius: '2px' }}></div>
                            <span style={{ color: r.color, fontWeight: 600 }}>{r.icon} {r.label}</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-2 mt-1 pt-1 border-t border-white/[0.1]" style={{ fontSize: '11px', color: '#D1D5DB' }}>
                        <div style={{ width: '20px', height: '4px', backgroundColor: '#EF4444', borderRadius: '2px' }}></div>
                        <span style={{ color: '#EF4444', fontWeight: 700 }}>✨ AI OPTIMIZED</span>
                    </div>
                </div>
            </div>

            {/* TOP BAR */}
            <div className="absolute top-4 right-4 z-[10000] flex gap-2">
                <button
                    onClick={async () => { 
                        const t = toast.loading("Injecting storm anomaly...");
                        try {
                            await axios.post('http://localhost:8000/api/simulate/storm'); 
                            const res = await axios.post('http://localhost:8080/api/alerts/storm-reroute');
                            toast.success(`Storm injected. ${res.data?.rerouted || 0} alert(s) generated!`, { id: t });
                        } catch(e) {
                            toast.error("Storm simulation applied but alerts generation failed.", { id: t });
                        }
                    }}
                    style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#F87171', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 600, backdropFilter: 'blur(8px)', cursor: 'pointer' }}
                >🌪 Inject Storm</button>
                <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#9CA3AF', padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, backdropFilter: 'blur(8px)', cursor: 'pointer' }}>✕ Close</button>
            </div>

            {/* ALL HIGH RISK BANNER */}
            {allHighRisk && (
                <div className="absolute z-[10001]" style={{top:'24px', left:'50%', transform:'translateX(-50%)', background:'rgba(220,38,38,0.95)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,160,160,0.4)', borderRadius:'12px', padding:'12px 24px', boxShadow:'0 8px 30px rgba(220,38,38,0.4)'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
                        <span style={{fontSize:'28px'}}>🛑</span>
                        <div>
                            <div style={{fontWeight:800, fontSize:'14px', color:'#FFF'}}>DO NOT TRAVEL: ALL ROUTES HIGH RISK</div>
                            <div style={{fontSize:'12px', color:'#FEE2E2', marginTop:'2px'}}>Every available transport mode carries critical risk. Recommended to hold shipment.</div>
                        </div>
                    </div>
                </div>
            )}

            {/* OPTIMAL ROUTE CARD */}
            {bestRoute && (
                <div className="absolute z-[10000]" style={{ top: '72px', right: '16px', width: '280px', background: 'rgba(11,13,20,0.9)', backdropFilter: 'blur(20px)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '16px', padding: '16px', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px', paddingBottom:'12px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.25)', color:'#10B981', padding:'2px 8px', borderRadius:'6px', fontSize:'9px', fontWeight:700 }}>OPTIMAL ROUTE</div>
                        <span style={{ fontWeight:700, fontSize:'13px', color:'#F9FAFB' }}>{bestRoute.mode}</span>
                        <div style={{ marginLeft:'auto', width:'6px', height:'6px', borderRadius:'50%', background:'#10B981', boxShadow:'0 0 8px #10B981' }}></div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                        <div>
                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'10px', color:'#9CA3AF', marginBottom:'5px' }}>
                                <span>Risk Level</span>
                                <span style={{ color: bestRoute.safety_score > 70 ? '#10B981' : '#F97316', fontWeight:700 }}>{Math.round(100 - bestRoute.safety_score)}%</span>
                            </div>
                            <div style={{ height:'4px', width:'100%', background:'rgba(255,255,255,0.06)', borderRadius:'4px', overflow:'hidden' }}>
                                <div style={{ height:'100%', background: bestRoute.safety_score > 70 ? 'linear-gradient(90deg,#059669,#10B981)' : 'linear-gradient(90deg,#EA580C,#F97316)', width:`${100 - bestRoute.safety_score}%`, borderRadius:'4px' }}></div>
                            </div>
                            <p style={{ fontSize:'9px', color:'#6B7280', marginTop:'4px', textTransform:'uppercase', letterSpacing:'0.08em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                                ⚡ {bestRoute.active_threats?.length > 0 ? `${bestRoute.active_threats.length} THREATS DETECTED` : 'NO MAJOR DISRUPTIONS'}
                            </p>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', paddingTop:'10px', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'10px' }}>
                                <div style={{ fontSize:'9px', color:'#6B7280', textTransform:'uppercase', marginBottom:'4px' }}>ETA</div>
                                <div style={{ fontSize:'18px', fontWeight:700, color:'#F9FAFB' }}>{bestRoute.eta_hours}<span style={{ fontSize:'11px', color:'#9CA3AF', fontWeight:400 }}> h</span></div>
                            </div>
                            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'10px' }}>
                                <div style={{ fontSize:'9px', color:'#6B7280', textTransform:'uppercase', marginBottom:'4px' }}>Est. Cost</div>
                                <div style={{ fontSize:'15px', fontWeight:700, color:'#C4B5FD' }}>₹{(bestRoute.cost_inr / 1000).toFixed(1)}<span style={{ fontSize:'10px', color:'#9CA3AF', fontWeight:400 }}> k</span></div>
                            </div>
                        </div>
                        <div style={{ background:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.12)', borderRadius:'8px', padding:'8px 10px', fontSize:'10px', color:'#93C5FD' }}>
                            🧠 ML Score: <strong>{bestRoute.ml_score}</strong>/100 • Confidence: <strong>{Math.round(bestRoute.confidence * 100)}%</strong>
                        </div>
                        <div style={{ fontSize:'10px', color:'#6B7280' }}>
                            🌱 Carbon: <span style={{ color:'#86EFAC' }}>{bestRoute.carbon_kg} kg CO₂</span> &nbsp;•&nbsp; 📏 {bestRoute.distance_km} km
                        </div>
                    </div>
                </div>
            )}

            {/* RISK REASON WINDOW */}
            {bestRoute && (
                <div className="absolute z-[10000]" style={{ top: '390px', right: '16px', width: '280px', background: 'rgba(11,13,20,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '16px', padding: '16px', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px', paddingBottom:'8px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.25)', color:'#F59E0B', padding:'2px 8px', borderRadius:'6px', fontSize:'9px', fontWeight:700 }}>RISK ANALYSIS</div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#D1D5DB', lineHeight: '1.6' }}>
                        <div className="mb-2">
                            <strong>Active Threat Factors:</strong><br/>
                            <div style={{ color: '#F87171', marginTop: '2px' }}>
                                {bestRoute.active_threats?.length > 0 
                                    ? bestRoute.active_threats.map((t, idx) => <div key={idx} style={{ paddingLeft: '8px', borderLeft: '2px solid rgba(248,113,113,0.5)', marginBottom: '4px' }}>{t}</div>) 
                                    : <span style={{ color: '#10B981' }}>None detected on this path</span>}
                            </div>
                        </div>
                        <div className="mb-2" style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px' }}><strong>Route Selection:</strong><br/>{bestRoute.justification}</div>
                        <div style={{ color: '#9CA3AF' }}><strong>AI Model Context:</strong><br/>{mlPredictions?.ml_justification}</div>
                    </div>
                </div>
            )}

            {/* MAP */}
            <MapContainer center={center} zoom={5} style={{ height:"100%", width:"100%" }}>
                <TileLayer url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png" />
                <MapUpdater center={center} />
                {heatmapZones.map((zone, i) => (
                    <Circle key={i} center={[zone.lat, zone.lng]} radius={zone.radius_km * 1000}
                        pathOptions={{ color: zone.type === 'WEATHER' ? '#3B82F6' : zone.type === 'TRAFFIC' ? '#F59E0B' : zone.type === 'GEOPOLITICAL' ? '#EF4444' : '#8B5CF6', fillOpacity: 0.15 }}>
                        <Tooltip>{zone.type} ({zone.intensity}%)</Tooltip>
                    </Circle>
                ))}
                {mlPredictions?.predictions ? mlPredictions.predictions.map(p => {
                    let pathPositions = [];
                    try {
                        if (typeof p.polyline === "string") pathPositions = JSON.parse(p.polyline).map(pt => [pt.lat, pt.lng]);
                        else if (Array.isArray(p.polyline)) pathPositions = p.polyline.map(pt => [pt.lat, pt.lng]);
                    } catch {}
                    let displayPositions = pathPositions.map(([lat, lng]) => {
                        let latOffset = 0, lngOffset = 0;
                        if (p.mode === 'AIR') { latOffset = 0.08; lngOffset = 0.08; }
                        else if (p.mode === 'WATER') { latOffset = -0.08; lngOffset = -0.08; }
                        return [lat + latOffset, lng + lngOffset];
                    });
                    if (displayPositions.length >= 2) {
                        let lngAcc = 0;
                        for (let i = 1; i < displayPositions.length; i++) {
                            let prevLng = displayPositions[i-1][1];
                            let currLng = displayPositions[i][1] + lngAcc;
                            if (currLng - prevLng > 180) { lngAcc -= 360; currLng -= 360; }
                            else if (currLng - prevLng < -180) { lngAcc += 360; currLng += 360; }
                            displayPositions[i][1] = currLng;
                        }
                    }
                    if (displayPositions.length < 2) return null;
                    const colorMap = { "AIR":"#38BDF8", "WATER":"#818CF8", "ROAD":"#A78BFA" };
                    const dashMap = { "AIR":"10, 10", "WATER":"15, 10, 5, 10", "ROAD":"" };
                    return (
                        <React.Fragment key={`ml-${p.mode}`}>
                            <Polyline positions={displayPositions} color={colorMap[p.mode] || "#FFF"} weight={p.recommended ? 5 : 3} opacity={p.recommended ? 0.9 : 0.4} dashArray={dashMap[p.mode]}>
                                <Tooltip sticky>
                                    <div style={{ minWidth:"150px", fontSize:"11px" }}>
                                        <b>{p.mode} Route</b>{p.recommended && <span style={{ color:'#16a34a' }}> (BEST)</span>}<br/>
                                        🧠 Score: {p.ml_score} | ⚠ {p.risk_level} | ⏱ {p.eta_hours}h | 💰 ₹{Math.round(p.cost_inr).toLocaleString()}
                                    </div>
                                </Tooltip>
                            </Polyline>
                            {p.recommended && <Polyline positions={displayPositions} color="#EF4444" weight={3} opacity={1} dashArray="10, 12" interactive={false} />}
                        </React.Fragment>
                    );
                }) : routePositions.length > 0 && <Polyline positions={routePositions} color="#3B82F6" />}
                {originCoords && <Marker position={originCoords}><Popup>Origin</Popup></Marker>}
                {destCoords && <Marker position={destCoords}><Popup>Destination</Popup></Marker>}
            </MapContainer>

            {/* ML PANEL */}
            <div className="absolute bottom-4 left-4 z-[10000]" style={{ width:'300px', background:'rgba(11,13,20,0.9)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'16px', padding:'16px', boxShadow:'0 8px 40px rgba(0,0,0,0.6)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px', paddingBottom:'10px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#3B82F6', boxShadow:'0 0 8px #3B82F6' }}></div>
                    <span style={{ fontSize:'11px', fontWeight:700, color:'#F9FAFB' }}>AI Route Intelligence</span>
                    {loadingMl && <span style={{ fontSize:'9px', color:'#6B7280', marginLeft:'auto' }}>Updating…</span>}
                </div>
                {mlPredictions?.predictions?.map((p, idx) => {
                    const modeColors = { ROAD:'#A78BFA', AIR:'#38BDF8', WATER:'#818CF8' };
                    const modeIcons = { ROAD:'🚛', AIR:'✈', WATER:'🚢' };
                    const col = modeColors[p.mode] || '#9CA3AF';
                    const riskColor = p.risk_level === 'CRITICAL' ? '#EF4444' : p.risk_level === 'HIGH' ? '#F97316' : p.risk_level === 'MEDIUM' ? '#F59E0B' : '#10B981';
                    const costFormatted = p.cost_inr >= 100000 ? `₹${(p.cost_inr / 100000).toFixed(2)}L` : `₹${Math.round(p.cost_inr).toLocaleString('en-IN')}`;

                    // Check if WATER mode has a valid navigable polyline
                    let hasValidPolyline = true;
                    if (p.mode === 'WATER') {
                        try {
                            const poly = typeof p.polyline === 'string' ? JSON.parse(p.polyline) : p.polyline;
                            hasValidPolyline = Array.isArray(poly) && poly.length >= 2;
                        } catch { hasValidPolyline = false; }
                    }

                    return (
                        <div key={p.mode} style={{ marginBottom: idx < mlPredictions.predictions.length - 1 ? '8px' : 0, padding:'10px 12px', borderRadius:'12px', border:`1px solid ${!hasValidPolyline ? 'rgba(100,100,100,0.2)' : p.recommended ? col + '40' : 'rgba(255,255,255,0.05)'}`, background: !hasValidPolyline ? 'rgba(255,255,255,0.01)' : p.recommended ? col + '0D' : 'rgba(255,255,255,0.02)', opacity: !hasValidPolyline ? 0.65 : 1 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: hasValidPolyline ? '6px' : '0' }}>
                                <span style={{ fontWeight:700, fontSize:'12px', color: hasValidPolyline ? col : '#6B7280' }}>{modeIcons[p.mode]} {p.mode}</span>
                                {!hasValidPolyline ? (
                                    <span style={{ fontSize:'8px', fontWeight:700, padding:'2px 7px', borderRadius:'5px', background:'rgba(239,68,68,0.1)', color:'#EF4444', border:'1px solid rgba(239,68,68,0.25)', letterSpacing:'0.05em' }}>🚫 ROUTE NOT FOUND</span>
                                ) : p.recommended ? (
                                    <span style={{ fontSize:'8px', fontWeight:700, padding:'2px 7px', borderRadius:'5px', background:col+'25', color:col, border:`1px solid ${col}40` }}>BEST</span>
                                ) : (
                                    <span style={{ fontSize:'8px', padding:'2px 7px', borderRadius:'5px', background:'rgba(255,255,255,0.05)', color:'#6B7280' }}>ALT</span>
                                )}
                            </div>
                            {!hasValidPolyline ? (
                                <div style={{ fontSize:'10px', color:'#4B5563', fontStyle:'italic', marginTop:'6px', lineHeight:1.5 }}>
                                    No navigable waterway between these locations. Water transport unavailable for this route.
                                </div>
                            ) : (
                                <>
                                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px', fontSize:'10px', color:'#9CA3AF' }}>
                                        <span>💰 {costFormatted}</span><span>⏱ {p.eta_hours}h ETA</span>
                                        <span style={{ color:riskColor }}>⚠ {p.risk_level}</span><span style={{ color:'#86EFAC' }}>🌱 {p.carbon_kg}kg</span>
                                    </div>
                                    <div style={{ marginTop:'6px', height:'3px', background:'rgba(255,255,255,0.05)', borderRadius:'3px', overflow:'hidden' }}>
                                        <div style={{ height:'100%', width:`${Math.min(p.ml_score,100)}%`, background:`linear-gradient(90deg,${col}80,${col})`, borderRadius:'3px' }}></div>
                                    </div>
                                    <div style={{ fontSize:'9px', color:'#6B7280', marginTop:'3px', textAlign:'right' }}>Score: {p.ml_score}/100</div>
                                </>
                            )}
                        </div>
                    );
                })}
                {!mlPredictions && !loadingMl && <div style={{ textAlign:'center', padding:'16px 0', color:'#4B5563', fontSize:'11px', fontStyle:'italic' }}>Awaiting prediction data…</div>}
            </div>
        </div>
    );
};

const AddShipmentModal = ({ onClose, onRefresh, onAutoTrack }) => {
    const [formData, setFormData] = useState({ name:'', origin:'', destination:'', estimatedDelivery:'' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.origin || !formData.destination) { toast.error('Please fill in all required fields.'); return; }
        setLoading(true);
        const submitToast = toast.loading('Registering new shipment...');
        try {
            const res = await axios.post('http://localhost:8080/api/shipments', {
                ...formData,
                estimatedDelivery: formData.estimatedDelivery ? new Date(formData.estimatedDelivery).toISOString() : null
            });
            const newShipment = res.data;
            toast.success('Shipment registered successfully!', { id: submitToast });
            onRefresh();
            onClose();
            if (onAutoTrack) onAutoTrack({ id:`SHP${newShipment.id}`, rawId:newShipment.id, name:newShipment.name, origin:newShipment.origin, destination:newShipment.destination, status:newShipment.status, risk:newShipment.riskScore??0, activeRoutePolyline:newShipment.activeRoutePolyline, currentLat:newShipment.currentLat, currentLng:newShipment.currentLng, isRerouted:newShipment.isRerouted, rerouteAlertData:newShipment.rerouteAlertData });
        } catch (err) { toast.error('Failed to register shipment.', { id: submitToast }); }
        finally { setLoading(false); }
    };

    return (
        <div className="absolute inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#1C1F2B] border border-[#2A2E3E] rounded-xl shadow-2xl w-[480px] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-[#2A2E3E] bg-[#161822]">
                    <h3 className="font-bold text-gray-200 flex items-center gap-2"><Plus className="w-5 h-5 text-blue-400" /> Register New Shipment</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Shipment Name / Cargo</label>
                        <div className="bg-[#13151D] border border-[#2A2E3E] rounded-lg flex items-center px-4 h-11 focus-within:border-blue-500 transition-colors">
                            <Package className="w-4 h-4 mr-3 text-gray-500" />
                            <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name:e.target.value})} placeholder="e.g. ELECTRONICS-X-204" className="bg-transparent border-none outline-none w-full text-sm text-gray-200" required />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Origin City</label>
                            <div className="bg-[#13151D] border border-[#2A2E3E] rounded-lg flex items-center px-4 h-11 focus-within:border-blue-500 transition-colors">
                                <MapPin className="w-4 h-4 mr-3 text-gray-500" />
                                <input type="text" value={formData.origin} onChange={(e) => setFormData({...formData, origin:e.target.value})} placeholder="Mumbai" className="bg-transparent border-none outline-none w-full text-sm text-gray-200" required />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Destination</label>
                            <div className="bg-[#13151D] border border-[#2A2E3E] rounded-lg flex items-center px-4 h-11 focus-within:border-blue-500 transition-colors">
                                <Navigation className="w-4 h-4 mr-3 text-gray-500" />
                                <input type="text" value={formData.destination} onChange={(e) => setFormData({...formData, destination:e.target.value})} placeholder="London" className="bg-transparent border-none outline-none w-full text-sm text-gray-200" required />
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Estimated Delivery</label>
                        <div className="bg-[#13151D] border border-[#2A2E3E] rounded-lg flex items-center px-4 h-11 focus-within:border-blue-500 transition-colors">
                            <Calendar className="w-4 h-4 mr-3 text-gray-500" />
                            <input type="date" value={formData.estimatedDelivery} onChange={(e) => setFormData({...formData, estimatedDelivery:e.target.value})} className="bg-transparent border-none outline-none w-full text-sm text-gray-200 [color-scheme:dark]" />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button type="button" onClick={onClose} className="flex-1 bg-[#242A38] text-gray-300 py-3 rounded-lg hover:bg-[#2C3345] border border-[#3A435A] transition-colors text-sm font-bold">Cancel</button>
                        <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-500 transition-colors text-sm font-bold flex items-center justify-center gap-2">
                            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Register Dispatch
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ShipmentManagement = ({ shipments = [], onRefresh }) => {
    const [filterType, setFilterType] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedShipment, setSelectedShipment] = useState(null);
    const [trackShipment, setTrackShipment] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    const displayData = shipments.map((s, i) => ({
        id: `SHP${String(i + 1).padStart(3, '0')}`, rawId: s.id,
        location: s.currentLat ? `${s.currentLat.toFixed(2)}°, ${s.currentLng?.toFixed(2)}°` : (s.origin || 'Unknown'),
        status: normalizeStatus(s.status) || 'IN TRANSIT',
        eta: s.estimatedDelivery ? new Date(s.estimatedDelivery).toLocaleDateString() : 'N/A',
        risk: s.riskScore ?? 0, origin: s.origin || '', destination: s.destination || '',
        currentLat: s.currentLat, currentLng: s.currentLng, activeRoutePolyline: s.activeRoutePolyline,
        standardRoutePolyline: s.standardRoutePolyline, alternateRoutesData: s.alternateRoutesData,
        transportMode: s.transportMode, totalCostInr: s.totalCostInr, modeJustification: s.modeJustification,
        carbonEmissions: s.carbonEmissions, isRerouted: s.isRerouted, rerouteAlertData: s.rerouteAlertData, name: s.name,
        username: s.username
    }));

    const filteredData = displayData.filter(row => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery || [row.id, row.location, row.origin, row.name, row.destination].some(f => (f||'').toLowerCase().includes(searchLower));
        const matchesFilter = filterType === 'ALL' || row.status === filterType.replace('_', ' ');
        return matchesSearch && matchesFilter;
    });

    const handleDelete = async (row) => {
        if (!row.rawId) { toast.error('Cannot delete: no server ID.'); return; }
        setActionLoading('delete-' + row.rawId);
        try {
            await axios.delete(`http://localhost:8080/api/shipments/${row.rawId}`);
            toast.success(`Shipment ${row.id} permanently removed.`);
            setSelectedShipment(null);
            if (onRefresh) onRefresh();
        } catch { toast.error('Delete failed. Check backend.'); }
        finally { setActionLoading(null); }
    };

    const handleToggleStatus = async (row) => {
        if (!row.rawId) {
            const newStatus = row.status === 'DELIVERED' ? 'IN TRANSIT' : 'DELIVERED';
            toast.success(`Status changed to ${newStatus} (local only)`);
            setSelectedShipment(prev => prev ? {...prev, status:newStatus} : null);
            return;
        }
        setActionLoading('status-' + row.rawId);
        const newStatusDisplay = row.status.toUpperCase().replace(/_/g,' ') === 'DELIVERED' ? 'IN TRANSIT' : 'DELIVERED';
        try {
            await axios.patch(`http://localhost:8080/api/shipments/${row.rawId}/status`);
            toast.success(`✅ Status changed to ${newStatusDisplay}`);
            setSelectedShipment(prev => prev ? {...prev, status:newStatusDisplay} : null);
            if (onRefresh) onRefresh();
        } catch (err) { toast.error(`Status toggle failed: ${err.response?.data?.message || err.message}`); }
        finally { setActionLoading(null); }
    };

    const handleGenerateReport = (shipment) => {
        try { exportShipmentPDF(shipment); toast.success(`📄 PDF report downloaded for ${shipment.id}`); }
        catch { toast.error('PDF generation failed.'); }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0B0D14] overflow-hidden text-gray-300 relative">
            {trackShipment && ReactDOM.createPortal(<TrackModal shipment={trackShipment} onClose={() => setTrackShipment(null)} />, document.body)}

            {/* Details Modal */}
            {selectedShipment && (
                <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#1C1F2B] border border-[#2A2E3E] rounded-xl shadow-2xl w-[440px] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-[#2A2E3E] bg-[#161822]">
                            <h3 className="font-bold text-gray-200">Shipment Details</h3>
                            <button onClick={() => setSelectedShipment(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            <div className="flex justify-between"><span className="text-gray-500 text-sm">Tracking ID</span><span className="font-mono text-gray-200">{selectedShipment.id}</span></div>
                            <div className="flex justify-between items-center bg-[#242A38] border border-[#2A2E3E] p-2 rounded-lg">
                                <span className="text-gray-400 text-xs uppercase tracking-wider font-bold">Creator Profile</span>
                                <span className="text-blue-400 font-bold text-sm bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.15)] flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    {selectedShipment.username || 'System API Auto-dispatch'}
                                </span>
                            </div>
                            {selectedShipment.origin && <div className="flex justify-between"><span className="text-gray-500 text-sm">Route</span><span className="text-gray-300 text-sm">{selectedShipment.origin} → {selectedShipment.destination}</span></div>}
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 text-sm">Status</span>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(selectedShipment.status)}`}>{selectedShipment.status}</span>
                                    <button onClick={() => handleToggleStatus(selectedShipment)} disabled={actionLoading === 'status-' + selectedShipment.rawId} className="flex items-center gap-1 text-xs bg-[#2A2E3E] hover:bg-[#3A435A] text-gray-300 px-2 py-1 rounded border border-[#3A435A] transition-colors">
                                        {actionLoading === 'status-' + selectedShipment.rawId ? <RefreshCw className="w-3 h-3 animate-spin" /> : selectedShipment.status === 'DELIVERED' ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />} Toggle
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-between"><span className="text-gray-500 text-sm">Location</span><span className="text-gray-300 text-sm">{selectedShipment.location}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500 text-sm">ETA</span><span className="text-gray-300 text-sm">{selectedShipment.eta}</span></div>
                            {selectedShipment.isRerouted && (
                                <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 px-3 py-2 rounded text-xs text-orange-400">
                                    <Navigation className="w-3 h-3" /> AI Rerouted — Optimal alternate path active
                                </div>
                            )}
                            <div className="bg-[#1A1D27] p-3 rounded border border-[#2A2E3E] text-center">
                                <p className="text-xs text-gray-500 mb-1">Risk Assessment Score</p>
                                <p className={`text-2xl font-bold ${selectedShipment.risk > 60 ? 'text-red-500' : selectedShipment.risk > 30 ? 'text-orange-400' : 'text-green-500'}`}>{selectedShipment.risk}%</p>
                                <div className="h-1.5 w-full bg-[#262A38] rounded-full mt-2 overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-1000 ${selectedShipment.risk > 60 ? 'bg-red-500' : selectedShipment.risk > 30 ? 'bg-orange-400' : 'bg-green-500'}`} style={{ width:`${selectedShipment.risk}%` }}></div>
                                </div>
                            </div>
                            {(selectedShipment.rerouteAlertData || selectedShipment.risk > 30) && (
                                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2 text-red-400 font-bold text-[11px] uppercase tracking-wider"><ShieldAlert className="w-3.5 h-3.5" /> AI Risk Diagnostics</div>
                                    {selectedShipment.rerouteAlertData ? (() => { try { return JSON.parse(selectedShipment.rerouteAlertData).map((msg, i) => <div key={i} className="text-[11px] text-gray-400 flex gap-2"><span className="text-red-500/50">•</span>{msg}</div>); } catch { return <div className="text-[11px] text-gray-500 italic">Telemetry metadata unavailable.</div>; } })() : <div className="text-[11px] text-gray-400 italic">Elevated risk detected. Monitor live telemetry.</div>}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-[#2A2E3E] flex flex-wrap gap-2">
                            <button onClick={() => { setSelectedShipment(null); setTrackShipment(selectedShipment); }} className="flex-1 min-w-[140px] bg-blue-600/20 text-blue-400 py-2.5 rounded-lg hover:bg-blue-600/30 border border-blue-500/30 transition-all text-sm font-bold flex items-center justify-center gap-2">
                                <Navigation className="w-4 h-4" /> View Route Intelligence
                            </button>
                            <button onClick={() => { handleGenerateReport(selectedShipment); setSelectedShipment(null); }} className="bg-[#2C3B5E] text-blue-300 px-4 py-2.5 rounded-lg hover:bg-[#324570] transition-colors text-sm font-medium flex items-center gap-2">📄 Report</button>
                            {selectedShipment.status !== 'DELIVERED' && (
                                <button onClick={() => { setSelectedShipment(null); setTrackShipment(selectedShipment); }} className="flex-1 bg-[#1E3A2E] text-green-400 py-2 rounded hover:bg-[#224433] border border-green-500/20 transition-colors text-sm font-medium flex items-center justify-center gap-1">
                                    <MapPin className="w-3.5 h-3.5" /> Track Live
                                </button>
                            )}
                            <button onClick={() => handleDelete(selectedShipment)} disabled={actionLoading === 'delete-' + selectedShipment.rawId} className="flex items-center gap-1 px-4 bg-red-500/20 text-red-400 py-2 rounded hover:bg-red-500/30 border border-red-500/30 transition-colors text-sm font-medium">
                                {actionLoading === 'delete-' + selectedShipment.rawId ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
                            </button>
                            <button onClick={() => setSelectedShipment(null)} className="px-4 bg-[#242A38] text-gray-300 py-2 rounded hover:bg-[#2C3345] border border-[#3A435A] transition-colors text-sm font-medium">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {isAddModalOpen && <AddShipmentModal onClose={() => setIsAddModalOpen(false)} onRefresh={onRefresh} onAutoTrack={(ship) => setTrackShipment(ship)} />}

            {/* Header */}
            <div className="h-[64px] bg-[#0F111A] border-b border-white/[0.05] flex items-center justify-between px-8 shrink-0">
                <div>
                    <h2 className="text-[15px] font-bold text-white">Shipment Management</h2>
                    <p className="text-[11px] text-gray-600">{displayData.length} total dispatches tracked</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[10px] text-gray-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-5 flex flex-col gap-5 custom-scrollbar">
                <div className="flex items-center justify-between shrink-0">
                    <div className="flex gap-1.5 p-1 rounded-xl" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                        {[{label:'All',value:'ALL'},{label:'In Transit',value:'IN TRANSIT'},{label:'Delayed',value:'DELAYED'},{label:'Delivered',value:'DELIVERED'},{label:'On Hold',value:'ON HOLD'}].map(tab => (
                            <button key={tab.value} onClick={() => setFilterType(tab.value)} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterType === tab.value ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>
                                {tab.label}{filterType === tab.value && tab.value !== 'ALL' && <span className="ml-1.5 opacity-70">{filteredData.length}</span>}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all active:scale-95" style={{ boxShadow:'0 0 20px rgba(59,130,246,0.3)' }}>
                        <Plus className="w-3.5 h-3.5" /> New Shipment
                    </button>
                </div>

                <div className="flex gap-6 flex-1 min-h-[400px]">
                    <div className="flex-1 flex flex-col gap-3">
                        <div className="flex items-center px-4 h-10 rounded-xl shrink-0" style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
                            <Search className="w-3.5 h-3.5 mr-3 text-gray-600" />
                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by ID, cargo name, or city..." className="bg-transparent border-none outline-none w-full text-sm text-gray-300 placeholder:text-gray-700" />
                        </div>
                        <div className="flex-1 overflow-auto flex flex-col rounded-xl" style={{ border:'1px solid rgba(255,255,255,0.06)' }}>
                            <div className="flex px-4 py-3 text-[10px] font-bold text-gray-600 uppercase tracking-widest sticky top-0 z-10" style={{ background:'rgba(15,17,26,0.98)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                                <div className="w-[16%]">ID</div><div className="w-[20%]">Cargo / Name</div><div className="w-[18%]">Location</div><div className="w-[16%] text-center">Status</div><div className="w-[10%] text-center">Risk</div><div className="w-[20%] text-center">Actions</div>
                            </div>
                            <div className="flex flex-col">
                                {filteredData.length > 0 ? filteredData.map((row, idx) => (
                                    <div key={idx} className="flex items-center px-4 py-3 group cursor-pointer" style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background=''}>
                                        <div className="w-[16%] font-mono text-xs font-bold text-gray-400 group-hover:text-blue-400 transition-colors" onClick={() => setSelectedShipment(row)}>{row.id}</div>
                                        <div className="w-[20%] truncate pr-2 flex flex-col justify-center">
                                            <div className="text-sm text-gray-300 font-medium">{row.name || row.id}</div>
                                            <div className="text-[10px] text-blue-400/80 mt-0.5 font-semibold flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                {row.username || 'System Admin'}
                                            </div>
                                        </div>
                                        <div className="w-[18%] text-xs text-gray-500 truncate pr-2">{row.origin} → {row.destination}</div>
                                        <div className="w-[16%] flex justify-center"><span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider ${getStatusColor(row.status)}`}>{row.status}</span></div>
                                        <div className="w-[10%] text-center"><span className={`text-xs font-bold ${row.risk > 60 ? 'text-red-400' : row.risk > 30 ? 'text-orange-400' : 'text-emerald-400'}`}>{row.risk}%</span></div>
                                        <div className="w-[20%] flex justify-center gap-1.5">
                                            {row.status !== 'DELIVERED' ? (
                                                <button onClick={() => setTrackShipment(row)} className="text-blue-400 hover:text-blue-300 text-[10px] px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1" style={{ background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.2)' }}><MapPin className="w-3 h-3" /> Track</button>
                                            ) : (
                                                <button onClick={() => setSelectedShipment(row)} className="text-gray-400 hover:text-gray-300 text-[10px] px-2.5 py-1.5 rounded-lg font-semibold" style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' }}>View</button>
                                            )}
                                            <button onClick={() => setSelectedShipment(row)} className="text-gray-400 hover:text-white text-[10px] px-2.5 py-1.5 rounded-lg font-semibold" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>Details</button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-16 text-center"><Package className="w-10 h-10 mx-auto mb-3 text-gray-700" /><p className="text-sm text-gray-600">No shipments match your criteria.</p></div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right sidebar */}
                    <div className="w-[270px] flex flex-col gap-3 shrink-0 overflow-y-auto custom-scrollbar">
                        <div className="rounded-xl overflow-hidden flex flex-col" style={{ border:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.02)' }}>
                            <div className="px-3 py-2.5 flex items-center gap-2" style={{ borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                                <MapPin className="w-3 h-3 text-blue-400" /><span className="text-xs font-semibold text-gray-400">Live Fleet Map</span>
                            </div>
                            <div className="h-36 overflow-hidden">
                                <MapContainer center={[20,78]} zoom={4} style={{ width:'100%', height:'100%' }} zoomControl={false} attributionControl={false}>
                                    <TileLayer url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png" />
                                    {displayData.filter(s => s.currentLat && s.currentLng).map((s, i) => (
                                        <Marker key={i} position={[s.currentLat, s.currentLng]}
                                            icon={new L.DivIcon({ className:'', html:`<div style="width:8px;height:8px;background:${s.risk>60?'#EF4444':s.risk>30?'#F97316':'#10B981'};border:2px solid rgba(255,255,255,0.8);border-radius:50%"></div>` })}
                                            eventHandlers={{ click: () => setTrackShipment(s) }}>
                                            <Popup>{s.id} — {s.status}</Popup>
                                        </Marker>
                                    ))}
                                </MapContainer>
                            </div>
                            <p className="text-[10px] text-gray-700 px-3 py-2">Tap a dot to open route intelligence</p>
                        </div>
                        {[
                            { label:'Total', value:displayData.length, color:'#60A5FA', filter:'ALL', bg:'rgba(59,130,246,0.08)', border:'rgba(59,130,246,0.15)' },
                            { label:'In Transit', value:displayData.filter(d=>normalizeStatus(d.status)==='IN TRANSIT').length, color:'#34D399', filter:'IN TRANSIT', bg:'rgba(16,185,129,0.08)', border:'rgba(16,185,129,0.15)' },
                            { label:'Delayed', value:displayData.filter(d=>d.status==='DELAYED').length, color:'#F87171', filter:'DELAYED', bg:'rgba(239,68,68,0.08)', border:'rgba(239,68,68,0.15)' },
                            { label:'Delivered', value:displayData.filter(d=>d.status==='DELIVERED').length, color:'#A3E635', filter:'DELIVERED', bg:'rgba(163,230,53,0.08)', border:'rgba(163,230,53,0.15)' },
                        ].map((stat, i) => (
                            <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer" style={{ background:filterType===stat.filter?stat.bg:'rgba(255,255,255,0.02)', border:`1px solid ${filterType===stat.filter?stat.border:'rgba(255,255,255,0.05)'}` }} onClick={() => setFilterType(stat.filter)}>
                                <span className="text-xs font-medium text-gray-500">{stat.label}</span>
                                <span className="text-xl font-bold" style={{ color:stat.color }}>{stat.value}</span>
                            </div>
                        ))}
                        {displayData.filter(d => d.risk > 60).length > 0 && (
                            <div className="rounded-xl px-4 py-3" style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)' }}>
                                <div className="flex items-center gap-2 mb-1"><TriangleAlert className="w-3.5 h-3.5 text-red-400" /><span className="text-xs font-bold text-red-400">High Risk Dispatches</span></div>
                                <p className="text-[10px] text-gray-600">{displayData.filter(d=>d.risk>60).length} shipment(s) above 60% risk threshold. Review immediately.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Summary Strip */}
                <div className="shrink-0">
                    <div className="rounded-xl flex items-center h-12" style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)' }}>
                        {[
                            { icon:Briefcase, label:'Total', value:displayData.length, color:'text-gray-300', filter:'ALL' },
                            { icon:Package, label:'Transit', value:displayData.filter(d=>normalizeStatus(d.status)==='IN TRANSIT').length, color:'text-blue-400', filter:'IN TRANSIT' },
                            { icon:XSquare, label:'Delayed', value:displayData.filter(d=>d.status==='DELAYED').length, color:'text-red-400', filter:'DELAYED' },
                            { icon:CheckSquare, label:'Delivered', value:displayData.filter(d=>d.status==='DELIVERED').length, color:'text-emerald-400', filter:'DELIVERED' },
                        ].map((item, i) => (
                            <div key={i} className={`flex-1 flex items-center justify-center gap-2 h-full cursor-pointer hover:bg-white/[0.03] transition-colors ${i===0?'rounded-l-xl':''} ${i===3?'rounded-r-xl':''}`}
                                style={{ borderRight:i<3?'1px solid rgba(255,255,255,0.05)':'none' }}
                                onClick={() => setFilterType(item.filter)}>
                                <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                                <span className="text-xs text-gray-600">{item.label}:</span>
                                <strong className={`text-sm ${item.color}`}>{item.value}</strong>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShipmentManagement;