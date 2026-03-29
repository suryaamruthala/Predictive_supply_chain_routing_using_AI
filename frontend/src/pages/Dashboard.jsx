import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useShipmentTracking } from '../hooks/useShipmentTracking';
import { MapContainer, TileLayer, Marker, Polyline, Popup, Circle, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Truck, AlertTriangle, ShieldCheck, Activity, Settings2, X, LogIn, Shield, MessageSquare } from 'lucide-react';
import ChatBot from '../components/ChatBot';
import axios from 'axios';
import '../i18n';

// Fix Leaflet's default icon path issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Create a custom truck icon for marker
const truckIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2764/2764333.png',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const { shipments, connected } = useShipmentTracking();
  const [heatmapZones, setHeatmapZones] = useState([]);
  
  // Check if user is logged in
  const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');
  
  const NODES = ['Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Bangalore', 'Hyderabad', 'Pune', 'Ahmedabad'];

  React.useEffect(() => {
     const fetchZones = async () => {
         try {
            const res = await fetch('http://localhost:8000/api/heatmap');
            const data = await res.json();
            setHeatmapZones(data.zones || []);
         } catch(e) { console.error("Could not fetch heatmaps"); }
     };
     fetchZones();
     const interval = setInterval(fetchZones, 3000); 
     return () => clearInterval(interval);
  }, []);

  const changeLanguage = (e) => {
    i18n.changeLanguage(e.target.value);
  };


  const getStatusColor = (status) => {
    switch(status) {
        case 'DELAYED': return 'text-red-400';
        case 'REROUTED': return 'text-orange-400';
        case 'IN_TRANSIT': return 'text-green-400';
        default: return 'text-white';
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden p-6 gap-6 relative">
      {/* Background blobs for glassmorphism */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/30 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="glass-panel flex justify-between items-center py-4 z-10 sticky top-0">
        <div className="flex items-center gap-3">
            <Activity className="text-white w-8 h-8" />
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                {t('dashboard_title')}
            </h1>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="text-sm font-medium mr-2">
                {connected ? <span className="text-green-400">● Live Connection</span> : <span className="text-red-400">● Disconnected</span>}
            </div>
            
            <div className="h-6 w-px bg-white/10 mx-1" />

            {currentUser ? (
               <div className="flex items-center gap-3 bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20 shadow-lg">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <span className="text-white text-sm font-semibold tracking-tight">{currentUser.username}</span>
               </div>
            ) : (
                <Link 
                    to="/login"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg border border-blue-400/50 transition-all flex items-center gap-2"
                >
                    <LogIn className="w-4 h-4" /> Sign In
                </Link>
            )}
            <select 
                onChange={changeLanguage} 
                defaultValue="en"
                className="bg-slate-800/50 border border-white/20 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 backdrop-blur-md"
            >
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="te">తెలుగు</option>
            </select>
        </div>
      </div>

      <div className="flex gap-6 h-full z-10">
        {/* Left Sidebar - KPIs -> Alerts */}
        <div className="w-[350px] flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
            {/* Shipment detail sidebar removed to focus on Global Risk Map */}
            <div className="flex flex-col gap-4">
                <div className="glass-panel p-4 flex flex-col gap-2">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                         <ShieldCheck className="w-6 h-6 text-green-400" />
                         Global Risk Monitor
                    </h2>
                    <p className="text-gray-400 text-sm">
                        AI identifies worldwide corridors at risk from war, weather, and geopolitical events.
                    </p>
                </div>
                
                <div className="glass-panel p-4">
                    <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-3">Live Risk Legend</h3>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full bg-[#ff3131] shadow-[0_0_8px_#ff3131]" />
                            <span className="text-sm text-gray-200">War / Armed Conflict</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full bg-[#00e5ff] shadow-[0_0_8px_#00e5ff]" />
                            <span className="text-sm text-gray-200">Extreme Weather</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full bg-[#f59e0b] shadow-[0_0_8px_#f59e0b]" />
                            <span className="text-sm text-gray-200">Geopolitical Hazard</span>
                        </div>
                    </div>
                </div>
            </div>
            {shipments.length === 0 && (
                 <div className="glass-panel text-center text-slate-400 py-10">
                    No active shipments found.
                 </div>
            )}
        </div>

        {/* Right side - Map view */}
        <div className="flex-1 glass-panel p-[4px] relative bg-slate-900/50 backdrop-blur-2xl overflow-hidden shadow-2xl">
            <MapContainer 
                center={[20.0, 10.0]} 
                zoom={3.2} 
                minZoom={2}
                style={{ width: '100%', height: '100%', borderRadius: '14px' }}
                zoomControl={false}
            >
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    attribution='&copy; <a href="https://www.esri.com/">Esri</a>, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
                />

                {heatmapZones.map((zone) => {
                    // Logic for risk colors: WAR = Sharp Red, WEATHER = Cyan/Blue, Traffic = Orange
                    const color = zone.type === 'WAR' ? '#ff3131' : 
                                  zone.type === 'WEATHER' ? '#00e5ff' : 
                                  zone.intensity > 60 ? '#ef4444' : '#f59e0b';
                    
                    return (
                        <Circle
                            key={`zone-${zone.id}`}
                            center={[zone.lat, zone.lng]}
                            pathOptions={{ 
                                fillColor: color, 
                                color: color,
                                weight: 1,
                                fillOpacity: 0.15 + (zone.intensity / 250)
                            }}
                            radius={zone.radius_km * 1000} 
                            stroke={true}
                        >
                            <Tooltip direction="top" opacity={1} className="glass-popup bg-black/80 text-white border border-white/10 backdrop-blur-md rounded px-2 py-1">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${zone.type === 'WAR' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-cyan-400'}`} />
                                    <span className="font-bold tracking-wider text-xs uppercase">{zone.type} RISK</span>
                                </div>
                                <span className="text-gray-400 text-[10px]">Zone Severity: {Math.round(zone.intensity)}%</span>
                            </Tooltip>
                        </Circle>
                    );
                })}

                {/* Shipment route details (Mumbai-Delhi etc) removed for global perspective */}
            </MapContainer>
        </div>
      </div>



      {/* AI ChatBot - Bottom Left Floating Widget */}
      <ChatBot />
    </div>
  );
};

export default Dashboard;
