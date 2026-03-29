import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Activity, ShieldAlert, Cloud, Zap, 
  MapPin, Anchor, Power, Truck, Box, TrendingDown, LayoutDashboard, Terminal, Bell
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

import { getDistance } from '../utils/mapUtils';
import UserRiskPortal from '../components/tabs/user/UserRiskPortal';
import UserRouteStrategist from '../components/tabs/user/UserRouteStrategist';
import UserTrackingMap from '../components/tabs/user/UserTrackingMap';
import UserSimulator from '../components/tabs/user/UserSimulator';

// Professional Leaflet Fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Node Icon for sleek markers
const createCustomIcon = (color) => {
    return L.divIcon({
        className: 'custom-icon',
        html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color};"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
    });
};

function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

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

    // Command Console State
    const [consoleInput, setConsoleInput] = useState('');
    const [simulatedPoints, setSimulatedPoints] = useState([]);
    const [mapCenter, setMapCenter] = useState([20, 0]);
    const [mapZoom, setMapZoom] = useState(2);
    
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');

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
        if (!sourceQuery || !destQuery) return;
        setIsRouting(true);
        const t = toast.loading("Synthesizing Neural Route Vectors via ML Engine...");
        
        try {
            // Use ML Prediction API for high-fidelity intelligence
            const mlRes = await axios.post('http://localhost:8000/api/ml-predict', {
                origin_name: sourceQuery,
                destination_name: destQuery
            });
            
            const ai = mlRes.data;
            
            // Map the high-fidelity results to state
            setRouteSource({ name: sourceQuery, lat: ai.origin.lat, lng: ai.origin.lng });
            setRouteDest({ name: destQuery, lat: ai.destination.lat, lng: ai.destination.lng });
            
            // Intelligence Data
            setRouteData({
                air: { 
                    cost: Math.round(ai.multimodal_analysis.AIR.estimated_cost_inr), 
                    time: Math.round(ai.multimodal_analysis.AIR.travel_time_hours), 
                    risk: Math.round(ai.multimodal_analysis.AIR.safety_score * 0.8) // Score to risk inv
                },
                road: { 
                    cost: Math.round(ai.multimodal_analysis.ROAD.estimated_cost_inr), 
                    time: Math.round(ai.multimodal_analysis.ROAD.travel_time_hours), 
                    risk: Math.round(ai.multimodal_analysis.ROAD.safety_score * 0.9)
                },
                sea: { 
                    cost: Math.round(ai.multimodal_analysis.WATER.estimated_cost_inr), 
                    time: Math.round(ai.multimodal_analysis.WATER.travel_time_hours), 
                    risk: Math.round(ai.multimodal_analysis.WATER.safety_score * 0.5)
                }
            });

            // Midpoint synthesis (for visualization)
            setMidways({
               road: { name: "Terrestrial Hub", lat: (ai.origin.lat + ai.destination.lat) / 2 + 2, lng: (ai.origin.lng + ai.destination.lng) / 2 },
               sea: { name: "Maritime Passage", lat: (ai.origin.lat + ai.destination.lat) / 2 - 4, lng: (ai.origin.lng + ai.destination.lng) / 2 }
            });

            setIsFollowing(true);
            toast.success("Intelligence Grid Synchronized. ML Vectors Locked.", { id: t });
            
        } catch (e) { 
            console.error(e);
            toast.error("Vector Calibration Failure: AI Service Offline.", { id: t }); 
        } finally { 
            setIsRouting(false); 
        }
    };

    // Console Command Processor
    const handleConsoleEnter = (e) => {
        if (e.key === 'Enter' && consoleInput.trim()) {
            const input = consoleInput.trim();
            const coordMatch = input.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);
            
            if (coordMatch) {
                const lat = parseFloat(coordMatch[1]);
                const lng = parseFloat(coordMatch[3]);
                setSimulatedPoints(prev => [...prev, { lat, lng, value: input, id: Date.now() }]);
                setMapCenter([lat, lng]);
                setMapZoom(6);
                setConsoleInput('');
                return;
            }

            const foundShipment = shipments.find(s => s.name && s.name.toLowerCase().includes(input.toLowerCase()));
            if (foundShipment && foundShipment.currentLat != null && foundShipment.currentLng != null) {
                setMapCenter([foundShipment.currentLat, foundShipment.currentLng]);
                setMapZoom(6);
                setConsoleInput('');
                return;
            }

            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&limit=1`)
                .then(res => res.json())
                .then(data => {
                    if (data && data[0]) {
                        const lat = parseFloat(data[0].lat);
                        const lng = parseFloat(data[0].lon);
                        setSimulatedPoints(prev => [...prev, { lat, lng, name: data[0].display_name.split(',')[0], id: Date.now() }]);
                        setMapCenter([lat, lng]);
                        setMapZoom(6);
                    }
                })
                .catch(() => {});
                
            setConsoleInput('');
        }
    };

    useEffect(() => {
        const fetchData = () => {
            const usernameParam = currentUser.username ? `?username=${currentUser.username}` : '';
            axios.get(`http://localhost:8080/api/shipments${usernameParam}`)
                .then(res => setShipments(Array.isArray(res.data) ? res.data : []))
                .catch(err => { console.error(err); setShipments([]); });
            axios.get('http://localhost:8080/api/heatmap')
                .then(res => setHeatmapZones(Array.isArray(res.data?.zones) ? res.data.zones : []))
                .catch(err => { console.error(err); setHeatmapZones([]); });
        };
        fetchData();
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        sessionStorage.removeItem('currentUser');
        navigate('/');
    };

    // Derived Analytics
    const totalUnits = shipments.length;
    const avgRisk = shipments.length > 0 ? (shipments.reduce((a, s) => a + (s.riskScore || 0), 0) / shipments.length).toFixed(1) : '0';
    const totalCarbon = shipments.reduce((a, s) => a + (s.carbonEmissions || 0), 0).toFixed(0);
    const delayedUnits = shipments.filter(s => s.status === 'DELAYED').length;

    return (
        <div className="flex h-screen w-screen bg-[#07090F] text-slate-300 font-['Inter',_sans-serif] overflow-hidden selection:bg-blue-500/30">
            <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />
            
            {/* Ambient Background Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[180px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none" />
            
            {/* SIDEBAR */}
            <nav className="w-20 lg:w-64 bg-[#0B0E17]/80 backdrop-blur-3xl border-r border-white/5 flex flex-col z-50 transition-all duration-300">
                <div className="h-24 flex items-center justify-center lg:justify-start lg:px-8 border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                            <Anchor className="w-6 h-6 text-white" />
                        </div>
                        <div className="hidden lg:block">
                            <h1 className="text-xl font-bold text-white tracking-tight">Logi<span className="text-blue-400">Core</span></h1>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">Control Center</p>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 py-8 px-4 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
                    {[
                        { id: 'DASHBOARD', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Live Dashboard' },
                        { id: 'TRACKING', icon: <Truck className="w-5 h-5" />, label: 'Shipment Tracking' },
                        { id: 'RISK_PORTAL', icon: <ShieldAlert className="w-5 h-5" />, label: 'Risk Awareness' },
                        { id: 'STRATEGIST', icon: <Zap className="w-5 h-5" />, label: 'Route Strategy' },
                        { id: 'ALERTS', icon: <Bell className="w-5 h-5" />, label: 'Notifications' },
                        { id: 'SIMULATOR', icon: <Terminal className="w-5 h-5" />, label: 'Simulator' }
                    ].map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => { setActiveTab(item.id); setTargetLocation(null); setSelectedShipId(null); setRouteSource(null); }}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${
                                activeTab === item.id 
                                ? 'bg-white/5 text-white border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]' 
                                : 'text-slate-500 hover:bg-white/5 hover:text-slate-300 border border-transparent'
                            }`}
                        >
                            <div className={activeTab === item.id ? 'text-blue-400' : ''}>{item.icon}</div>
                            <span className="hidden lg:block text-sm font-semibold tracking-wide">{item.label}</span>
                        </button>
                    ))}
                    
                    <div className="p-4 rounded-2xl text-slate-500 hidden lg:block text-xs mt-4 border border-dashed border-white/5">
                        <span className="block text-slate-400 font-semibold mb-1">Agent Status:</span>
                        <div className="flex items-center gap-2 text-green-400 font-mono tracking-wide">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Online ({currentUser.username || 'Guest'})
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-white/5">
                    <button onClick={handleLogout} className="w-full flex items-center justify-center lg:justify-start gap-4 p-4 rounded-xl text-slate-400 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 border border-transparent transition-all group">
                        <Power className="w-5 h-5 group-hover:text-red-400 transition-colors" />
                        <span className="hidden lg:block text-sm font-semibold">Terminate Session</span>
                    </button>
                </div>
            </nav>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col h-full relative z-10 overflow-hidden">
                {/* Header */}
                <header className="h-24 px-8 flex items-center justify-between border-b border-white/5 bg-[#0B0E17]/50 backdrop-blur-md">
                    <div>
                        <h2 className="text-2xl font-bold text-white">{activeTab.replace('_', ' ')} OVERVIEW</h2>
                        <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-green-400" /> Real-time telemetry synchronized
                        </p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Network Time</p>
                            <p className="text-white font-mono">{new Date().toLocaleTimeString()}</p>
                        </div>
                    </div>
                </header>

                {activeTab === 'DASHBOARD' && (
                    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { title: 'Active Units', value: totalUnits, icon: <Truck className="w-6 h-6 text-blue-400"/>, color: 'from-blue-500/20 to-blue-600/5', border: 'border-blue-500/20' },
                                { title: 'Avg Risk Index', value: `${avgRisk}%`, icon: <ShieldAlert className="w-6 h-6 text-orange-400"/>, color: 'from-orange-500/20 to-orange-600/5', border: 'border-orange-500/20' },
                                { title: 'CO₂ Footprint', value: `${totalCarbon} kg`, icon: <Cloud className="w-6 h-6 text-cyan-400"/>, color: 'from-cyan-500/20 to-cyan-600/5', border: 'border-cyan-500/20' },
                                { title: 'Delayed Nodes', value: delayedUnits, icon: <TrendingDown className="w-6 h-6 text-red-400"/>, color: 'from-red-500/20 to-red-600/5', border: 'border-red-500/20' }
                            ].map((kpi, idx) => (
                                <div key={idx} className={`relative overflow-hidden bg-gradient-to-br ${kpi.color} border ${kpi.border} p-6 rounded-3xl backdrop-blur-md transition-transform hover:-translate-y-1 duration-300`}>
                                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                                    <div className="flex items-start justify-between">
                                        <div className="p-3 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
                                            {kpi.icon}
                                        </div>
                                        <SparklesIcon />
                                    </div>
                                    <div className="mt-6">
                                        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{kpi.title}</h3>
                                        <p className="text-4xl font-bold text-white mt-1 tracking-tight">{kpi.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 h-[500px]">
                            {/* Live Tactical Map */}
                            <div className="xl:col-span-2 relative bg-[#0B0E17]/80 border border-white/10 rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] group">
                                <div className="absolute top-0 left-0 w-full p-6 z-[400] bg-gradient-to-b from-[#0B0E17] to-transparent pointer-events-none">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-blue-400" /> Live Tracking Map
                                    </h3>
                                </div>

                                {/* Tactical Terminal Console */}
                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[400] w-[85%] max-w-lg">
                                    <div className="bg-[#0B0E17]/90 backdrop-blur-2xl border border-blue-500/30 rounded-2xl p-1.5 flex items-center gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.8)] transition-all focus-within:border-blue-400 focus-within:shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                                        <div className="p-2 bg-blue-500/10 rounded-xl">
                                            <Terminal className="w-4 h-4 text-blue-400 animate-pulse" />
                                        </div>
                                        <input 
                                            type="text"
                                            value={consoleInput}
                                            onChange={e => setConsoleInput(e.target.value)}
                                            onKeyDown={handleConsoleEnter}
                                            placeholder="Enter coordinates (45.2, 12.1), location, or Shipment ID..."
                                            className="flex-1 bg-transparent border-none text-blue-100 text-sm font-mono placeholder:text-slate-600 focus:outline-none placeholder:font-sans"
                                        />
                                        {consoleInput && <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mr-3 animate-fade-in">Press Enter ↵</span>}
                                    </div>
                                </div>
                                
                                <MapContainer 
                                    center={[20, 0]} 
                                    zoom={2} 
                                    style={{ height: '100%', width: '100%', background: '#0a0d14' }}
                                    zoomControl={false}
                                    attributionControl={false}
                                >
                                    <ChangeView center={mapCenter} zoom={mapZoom} />
                                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                    
                                    {shipments.map(s => {
                                        if (s.currentLat == null || s.currentLng == null) return null;
                                        const mColor = s.status === 'DELAYED' ? '#ef4444' : s.status === 'TRANSIT' ? '#3b82f6' : '#22c55e';
                                        return (
                                            <Marker 
                                                key={s.id} 
                                                position={[s.currentLat, s.currentLng]}
                                                icon={createCustomIcon(mColor)}
                                            >
                                                <Tooltip direction="top" offset={[0, -10]} opacity={1} className="custom-tooltip">
                                                    <div className="text-center font-sans">
                                                        <p className="font-bold text-slate-900">{s.name}</p>
                                                        <p className="text-xs text-slate-600 font-semibold">{s.origin} → {s.destination}</p>
                                                    </div>
                                                </Tooltip>
                                            </Marker>
                                        );
                                    })}

                                    {simulatedPoints.map(p => (
                                        <Marker key={p.id} position={[p.lat, p.lng]} icon={createCustomIcon('#eab308')}>
                                            <Tooltip permanent direction="bottom" offset={[0, 10]} opacity={1} className="custom-tooltip !bg-yellow-500/10 !border !border-yellow-500/30 !backdrop-blur-md">
                                                <div className="text-center font-mono">
                                                    <p className="font-bold text-yellow-500 text-[10px] uppercase tracking-widest">TACTICAL TARGET</p>
                                                    <p className="text-xs text-yellow-100/70">{p.name || `${p.lat.toFixed(2)}, ${p.lng.toFixed(2)}`}</p>
                                                </div>
                                            </Tooltip>
                                        </Marker>
                                    ))}
                                </MapContainer>
                            </div>

                            {/* Telemetry Log */}
                            <div className="bg-[#0B0E17]/80 border border-white/10 rounded-[32px] p-6 shadow-xl flex flex-col">
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-yellow-400" /> Active Registry
                                </h3>
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                                    {shipments.map(s => (
                                        <div key={s.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="text-sm font-bold text-white">{s.name}</p>
                                                <span className={`text-[9px] px-2 py-1 rounded-md font-bold uppercase ${s.status === 'DELAYED' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                                    {s.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 font-medium mb-3">{s.origin} to {s.destination}</p>
                                            
                                            <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
                                                <div className="flex items-center gap-1.5">
                                                    <TargetIcon color="text-slate-500"/>
                                                    {s.currentLat?.toFixed(2)}, {s.currentLng?.toFixed(2)}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Cloud className="w-3.5 h-3.5 text-slate-500"/>
                                                    {s.carbonEmissions?.toFixed(1)}kg
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {shipments.length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                            <Box className="w-10 h-10 mb-2 opacity-20" />
                                            <p className="text-sm font-semibold">No shipments active</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- RESTORED TABS --- */}
                {activeTab === 'RISK_PORTAL' && (
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
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
                    </div>
                )}

                {activeTab === 'STRATEGIST' && (
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
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
                    </div>
                )}

                {activeTab === 'TRACKING' && (
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <UserTrackingMap 
                            shipments={shipments} 
                            selectedShip={selectedShip} 
                            selectedShipId={selectedShipId} 
                            setSelectedShipId={setSelectedShipId} 
                            isFollowing={isFollowing} 
                            setIsFollowing={setIsFollowing} 
                            simulatedPoints={simulatedPoints}
                        />
                    </div>
                )}

                {activeTab === 'SIMULATOR' && (
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <UserSimulator currentUser={currentUser} />
                    </div>
                )}

                {/* Legacy features without explicit logic just render placeholder */}
                {['ALERTS'].includes(activeTab) && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500">
                        <Activity className="w-16 h-16 mb-6 opacity-20" />
                        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">{activeTab.replace('_', ' ')}</h2>
                        <p className="text-sm text-center max-w-sm">This module's critical functions have been integrated natively into the Global Live Tracking map.</p>
                        <button onClick={() => setActiveTab('DASHBOARD')} className="mt-8 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:-translate-y-0.5">
                            Return to Mission Control
                        </button>
                    </div>
                )}
            </main>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
                .leaflet-container { background: transparent !important; }
                .custom-tooltip {
                    background: rgba(255, 255, 255, 0.95);
                    border: none;
                    border-radius: 8px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                    padding: 8px 12px;
                }
                .custom-tooltip::before { display: none; }
            `}</style>
        </div>
    );
};

// Tiny micro-components
const SparklesIcon = () => (
    <svg className="w-4 h-4 text-white/20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22Z" />
    </svg>
);
const TargetIcon = ({color}) => (
    <svg className={`w-3.5 h-3.5 ${color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
    </svg>
);

export default UserDashboard;
