import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Tooltip, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { 
  Activity, ShieldAlert, Bell, Terminal, 
  LogOut, Sparkles, 
  Zap, Compass, Anchor, Crosshair,
  Truck, List, AlertTriangle, 
  Search, Loader2
} from 'lucide-react';

// Shared Utilities
import { MapFocuser, getDistance } from '../utils/mapUtils';

// New Tab Components
import UserOverview from '../components/tabs/user/UserOverview';
import UserRiskPortal from '../components/tabs/user/UserRiskPortal';
import UserRouteStrategist from '../components/tabs/user/UserRouteStrategist';
import UserTrackingMap from '../components/tabs/user/UserTrackingMap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

// Professional Leaflet Fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// (MapFocuser and getDistance moved to /utils/mapUtils.js)

const UserDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('DASHBOARD');
    const [shipments, setShipments] = useState([]);
    const [heatmapZones, setHeatmapZones] = useState([]);
    const [selectedShipId, setSelectedShipId] = useState(null);
    const [isFollowing, setIsFollowing] = useState(false);
    
    // Portal / Search States
    const [searchQuery, setSearchQuery] = useState('');
    const [targetLocation, setTargetLocation] = useState(null);
    const [calculatedRisk, setCalculatedRisk] = useState(null);
    const [riskDetails, setRiskDetails] = useState(null);
    const [isSearching, setIsSearching] = useState(false);

    // Strategist States (High-Fidelity)
    const [sourceQuery, setSourceQuery] = useState('');
    const [destQuery, setDestQuery] = useState('');
    const [routeSource, setRouteSource] = useState(null);
    const [routeDest, setRouteDest] = useState(null);
    const [isRouting, setIsRouting] = useState(false);
    const [routeData, setRouteData] = useState(null);
    const [midways, setMidways] = useState({ road: null, sea: null });

    // Simulation & Notification
    const [alerts, setAlerts] = useState([
        { id: 1, type: 'CRITICAL', msg: 'Vessel V-102 entering High-Risk Sector 4', time: '12:15:32' },
        { id: 2, type: 'WARNING', msg: 'Anomalous Weather detected in Suez Corridor', time: '12:14:15' }
    ]);
    const [newShipment, setNewShipment] = useState({ name: '', origin: '', destination: '' });

    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');

    const fetchData = () => {
        axios.get('http://localhost:8080/api/shipments').then(res => setShipments(res.data || []));
        axios.get('http://localhost:8080/api/heatmap').then(res => setHeatmapZones(res.data.zones || []));
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 2000);
        return () => clearInterval(interval);
    }, []);

    const selectedShip = useMemo(() => shipments.find(s => s.id === selectedShipId), [shipments, selectedShipId]);

    const handleGlobalSearch = async (query) => {
        setIsSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=1`, { headers: { 'User-Agent': 'LogiAI' } });
            const data = await res.json();
            if (data && data[0]) {
                const lat = parseFloat(data[0].lat), lon = parseFloat(data[0].lon);
                const locName = data[0].address.village || data[0].address.town || data[0].address.city || data[0].display_name.split(',')[0];
                setTargetLocation({ name: locName, full: data[0].display_name, lat, lng: lon });
                setIsFollowing(true);
                let geoBase = 12.0, weatherBase = 15.0;
                heatmapZones.forEach(z => { const d = getDistance(lat, lon, z.lat, z.lng); if (d < z.radius_km) { const impact = z.intensity * Math.pow(1 - d/z.radius_km, 1.2); if (z.type === 'WAR') geoBase = Math.max(geoBase, impact); else weatherBase = Math.max(weatherBase, impact); } });
                const finalRisk = Math.min(99.0, ((geoBase * 1.5) + (weatherBase * 0.8) + 5.0));
                setCalculatedRisk(finalRisk.toFixed(1));
                setRiskDetails({ stability: geoBase > 50 ? 'Severe Fragility' : 'Nominal', meteorological: weatherBase > 40 ? 'Vector Alert' : 'Normal Corridors', infrastructure: 'Secured Data Network', description: `AI identifies ${geoBase > 40 ? 'geopolitical friction' : 'standard Operational Vectors'}.` });
            }
        } catch (e) {} finally { setIsSearching(false); }
    };

    const handleRouteSearch = async (e) => {
        e.preventDefault();
        setIsRouting(true);
        const t = toast.loading("Synthesizing Geographical Route Vectors...");
        try {
            const [sRes, dRes] = await Promise.all([
                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(sourceQuery)}&limit=1`).then(r => r.json()),
                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destQuery)}&limit=1`).then(r => r.json())
            ]);
            if (sRes[0] && dRes[0]) {
                const sLat = parseFloat(sRes[0].lat), sLng = parseFloat(sRes[0].lon), dLat = parseFloat(dRes[0].lat), dLng = parseFloat(dRes[0].lon);
                setRouteSource({ name: sRes[0].display_name.split(',')[0], lat: sLat, lng: sLng });
                setRouteDest({ name: dRes[0].display_name.split(',')[0], lat: dLat, lng: dLng });
                setIsFollowing(true);

                // Realistic Midpoint Synthesis
                const latDiff = (sLat + dLat) / 2, lngDiff = (sLng + dLng) / 2;
                const roadMidLat = latDiff + 4, seaMidLat = latDiff - 8; // Road north-bias, Sea south-bias (avoid Himalayas)

                // Fetch "Middle Names" via Reverse Geocoding
                const [roadMidData, seaMidData] = await Promise.all([
                    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${roadMidLat}&lon=${lngDiff}`).then(r => r.json()),
                    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${seaMidLat}&lon=${lngDiff}`).then(r => r.json())
                ]);

                const getMName = (d) => d.address?.state || d.address?.city || d.display_name?.split(',')[0] || "Way-Point";
                setMidways({
                   road: { name: getMName(roadMidData), lat: roadMidLat, lng: lngDiff },
                   sea: { name: getMName(seaMidData), lat: seaMidLat, lng: lngDiff }
                });

                const dist = getDistance(sLat, sLng, dLat, dLng);
                const getRisk = (mode) => {
                    let risk = mode === 'AIR' ? 12 : mode === 'ROAD' ? 24 : 8;
                    heatmapZones.forEach(z => { const d = getDistance(latDiff, lngDiff, z.lat, z.lng); if (d < z.radius_km * 1.5) risk += (z.intensity * 0.4); });
                    return Math.min(99, risk);
                };

                setRouteData({ air: { cost: Math.round(dist * 18), time: Math.round(dist / 800), risk: getRisk('AIR') }, road: { cost: Math.round(dist * 4.5), time: Math.round(dist / 65), risk: getRisk('ROAD') }, sea: { cost: Math.round(dist * 1.2), time: Math.round(dist / 22), risk: getRisk('SEA') } });
                toast.success("H-Fiddy Route Vectors Latched Successfully.", { id: t });
            }
        } catch (e) { toast.error("Vector Calibration Failure."); } finally { setIsRouting(false); }
    };

    const handleProvision = (e) => { e.preventDefault(); toast.success(`${newShipment.name} Latched.`); setNewShipment({ name: '', origin: '', destination: '' }); };

    const classicFont = "font-['Inter',_system-ui,_sans-serif]";

    return (
        <div className={`flex h-screen w-screen bg-[#0f172a] text-slate-300 overflow-hidden ${classicFont}`}>
            <Toaster position="top-right" />
            
            {/* SIDE NAVIGATION (PRESERVED) */}
            <div className="w-24 lg:w-[280px] bg-[#1e293b] border-r border-slate-800 flex flex-col z-50">
                <div className="h-20 flex items-center px-6 border-b border-slate-800">
                    <div className="flex items-center gap-3 italic font-black"><Anchor className="w-10 h-10 text-blue-600" /> <div className="hidden lg:block leading-tight"><h1 className="text-xl text-white uppercase tracking-tighter">AI COMMAND</h1><p className="text-[10px] text-blue-400 uppercase tracking-widest leading-none">Global Hub</p></div></div>
                </div>
                <div className="flex-1 py-10 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                    {[
                        { id: 'DASHBOARD', icon: <Compass className="w-5 h-5" />, label: 'Dashboard' },
                        { id: 'TRACKING', icon: <Truck className="w-5 h-5" />, label: 'Shipment Tracking' },
                        { id: 'RISK_PORTAL', icon: <ShieldAlert className="w-5 h-5" />, label: 'Risk Awareness' },
                        { id: 'STRATEGIST', icon: <Zap className="w-5 h-5" />, label: 'Route Strategy' },
                        { id: 'ALERTS', icon: <Bell className="w-5 h-5" />, label: 'Notifications' },
                        { id: 'SIMULATOR', icon: <Terminal className="w-5 h-5" />, label: 'Simulator' }
                    ].map(item => (
                        <button key={item.id} onClick={() => { setActiveTab(item.id); setTargetLocation(null); setSelectedShipId(null); setRouteSource(null); }} className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
                            <div className="shrink-0">{item.icon}</div><span className="hidden lg:block text-sm font-bold uppercase tracking-widest">{item.label}</span>
                        </button>
                    ))}
                </div>
                <div className="p-6 border-t border-slate-800 italic uppercase font-black text-[10px] text-slate-500">{currentUser.username} // Agent</div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col relative bg-[#0f172a]">
                <div className="h-20 bg-[#1e293b] border-b border-slate-800 flex items-center justify-between px-10 z-20">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3 italic uppercase"><span className="w-1.5 h-6 bg-blue-600 rounded-full" /> {activeTab} HUB</h2>
                    <div className="flex items-center gap-8"><div className="flex flex-col items-end"><span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Fleet</span><span className="text-lg font-mono font-black text-blue-400 italic leading-none">{shipments.length} UNITS</span></div><div className="w-px h-10 bg-slate-800" /><div className="text-green-400 font-black italic uppercase text-xs">Neural Link Stable</div></div>
                </div>

                <div className="flex-1 relative overflow-hidden bg-[#0f172a]">
                    
                    {/* DASHBOARD VIEW */}
                    {activeTab === 'DASHBOARD' && (
                        <UserOverview 
                            shipments={shipments} 
                            setActiveTab={setActiveTab} 
                            setSelectedShipId={setSelectedShipId} 
                            setIsFollowing={setIsFollowing} 
                        />
                    )}

                    {/* RISK AWARENESS Portal */}
                    {activeTab === 'RISK_PORTAL' && (
                        <UserRiskPortal 
                            searchQuery={searchQuery} 
                            setSearchQuery={setSearchQuery} 
                            handleGlobalSearch={handleGlobalSearch} 
                            targetLocation={targetLocation} 
                            calculatedRisk={calculatedRisk} 
                            riskDetails={riskDetails} 
                            isFollowing={isFollowing} 
                            setIsFollowing={setIsFollowing} 
                            heatmapZones={heatmapZones} 
                        />
                    )}

                    {/* ROUTE STRATEGY */}
                    {activeTab === 'STRATEGIST' && (
                        <UserRouteStrategist 
                            sourceQuery={sourceQuery} 
                            setSourceQuery={setSourceQuery} 
                            destQuery={destQuery} 
                            setDestQuery={setDestQuery} 
                            handleRouteSearch={handleRouteSearch} 
                            isRouting={isRouting} 
                            routeSource={routeSource} 
                            routeDest={routeDest} 
                            routeData={routeData} 
                            midways={midways} 
                            isFollowing={isFollowing} 
                            setIsFollowing={setIsFollowing} 
                        />
                    )}

                    {/* SHIPMENT TRACKING */}
                    {activeTab === 'TRACKING' && (
                        <UserTrackingMap 
                            shipments={shipments} 
                            selectedShip={selectedShip} 
                            selectedShipId={selectedShipId} 
                            setSelectedShipId={setSelectedShipId} 
                            isFollowing={isFollowing} 
                            setIsFollowing={setIsFollowing} 
                        />
                    )}
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
                .shadow-glow { box-shadow: 0 0 25px rgba(59, 130, 246, 0.4); }
                .shadow-3xl { box-shadow: 0 50px 100px -20px rgba(0,0,0,1); }
                .animate-spin-slow { animation: spin 10s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .route-tooltip { pointer-events: none; border-radius: 6px; padding: 4px 10px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); white-space: nowrap; }
                .tactical-label { pointer-events: none; border-radius: 6px; padding: 2px 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); white-space: nowrap; }
            `}</style>
        </div>
    );
};

export default UserDashboard;
