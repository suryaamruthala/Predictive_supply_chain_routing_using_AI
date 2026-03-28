import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useShipmentTracking } from '../hooks/useShipmentTracking';
import { MapContainer, TileLayer, Marker, Polyline, Popup, Circle, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Truck, AlertTriangle, ShieldCheck, Activity, Settings2, X, LogIn, Shield } from 'lucide-react';
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
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [message, setMessage] = useState(null);
  const [newName, setNewName] = useState('');
  const [newOrigin, setNewOrigin] = useState('Mumbai');
  const [newDestination, setNewDestination] = useState('Delhi');
  
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

  const handleCreateShipment = async (e) => {
    e.preventDefault();
    if(newOrigin === newDestination) {
      setMessage("Origin and Destination cannot be the same.");
      return;
    }
    setMessage(`Spawning simulation: ${newName}...`);
    try {
      await axios.post('http://localhost:8080/api/shipments', {
        name: newName,
        origin: newOrigin,
        destination: newDestination,
        estimatedDelivery: new Date(Date.now() + 86400000*3).toISOString()
      });
      setMessage(`Successfully created! AI is drawing optimal route.`);
      setNewName('');
      setTimeout(() => setMessage(null), 4000);
    } catch(err) {
      setMessage("Error creating simulated routing.");
      setTimeout(() => setMessage(null), 3000);
    }
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
            <button 
                onClick={() => setIsSimulatorOpen(true)}
                className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 font-semibold py-2 px-4 rounded-lg flex items-center gap-2 border border-blue-500/30 transition-all font-mono"
            >
                <Settings2 className="w-4 h-4" /> Simulator Console
            </button>
            <div className="text-sm font-medium">
                {connected ? <span className="text-green-400">● Live Connection</span> : <span className="text-red-400">● Disconnected</span>}
            </div>
            <select 
                onChange={changeLanguage} 
                defaultValue="en"
                className="bg-slate-800/50 border border-white/20 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 backdrop-blur-md"
            >
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="te">తెలుగు</option>
            </select>
            <Link
                to="/admin"
                className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 hover:from-purple-600/40 hover:to-indigo-600/40 text-purple-300 font-semibold py-2 px-4 rounded-lg flex items-center gap-2 border border-purple-500/30 transition-all"
            >
                <Shield className="w-4 h-4" /> Admin Portal
            </Link>
        </div>
      </div>

      <div className="flex gap-6 h-full z-10">
        {/* Left Sidebar - KPIs -> Alerts */}
        <div className="w-[350px] flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
            {shipments.map((shipment) => {
                let coords = [];
                let alerts = [];
                try {
                    coords = shipment.activeRoutePolyline ? JSON.parse(shipment.activeRoutePolyline) : [];
                    alerts = shipment.rerouteAlertData ? JSON.parse(shipment.rerouteAlertData) : [];
                } catch(e) {}
                
                return (
                <div key={shipment.id} className="glass-panel flex flex-col gap-4">
                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Truck className="w-5 h-5 text-blue-400" />
                            {shipment.name}
                        </h2>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full bg-slate-900/50 border border-white/10 ${getStatusColor(shipment.status)}`}>
                            {t(shipment.status.toLowerCase()) || shipment.status}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                        <div>
                            <p className="text-slate-400 text-xs">{t('origin')}</p>
                            <p className="font-medium text-white shadow-sm">{shipment.origin}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs">{t('destination')}</p>
                            <p className="font-medium text-white shadow-sm">{shipment.destination}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs">{t('eta')}</p>
                            <p className="font-medium">{new Date(shipment.estimatedDelivery).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs">{t('carbon')}</p>
                            <p className="font-medium">{shipment.carbonEmissions ? shipment.carbonEmissions.toFixed(1) : 0} kg CO2</p>
                        </div>
                    </div>

                    {/* AI Risk Score Indicator */}
                    <div className="mt-2 text-sm p-3 bg-slate-900/40 rounded-lg border border-white/5">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-slate-300 font-medium flex items-center gap-1">
                                {shipment.riskScore > 50 ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <ShieldCheck className="w-4 h-4 text-green-400" />}
                                {t('risk_score')}
                            </span>
                            <span className={`font-bold ${shipment.riskScore > 50 ? 'text-red-400' : 'text-green-400'}`}>
                                {shipment.riskScore}/100
                            </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 mb-2">
                          <div className={`h-2 rounded-full ${shipment.riskScore > 50 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${shipment.riskScore}%` }}></div>
                        </div>

                        {alerts.length > 0 && (
                            <div className="mt-3">
                                <p className="text-orange-300 text-xs mb-1 font-semibold">AI Intervention Log:</p>
                                <ul className="list-disc pl-4 text-orange-200/80 text-[11px] space-y-1">
                                    {alerts.map((a, i) => <li key={i}>{a}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )})}
            {shipments.length === 0 && (
                 <div className="glass-panel text-center text-slate-400 py-10">
                    No active shipments found.
                 </div>
            )}
        </div>

        {/* Right side - Map view */}
        <div className="flex-1 glass-panel p-[4px] relative bg-slate-900/50 backdrop-blur-2xl overflow-hidden shadow-2xl">
            <MapContainer 
                center={[21.0, 78.0]} 
                zoom={5} 
                style={{ width: '100%', height: '100%', borderRadius: '14px' }}
                zoomControl={false}
            >
                <TileLayer
                    url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OSM</a>, <a href="https://carto.com/attributions">CARTO</a>'
                />

                {heatmapZones.map((zone) => {
                    const color = zone.intensity > 60 ? '#ef4444' : zone.intensity > 30 ? '#f59e0b' : '#3b82f6';
                    return (
                        <Circle
                            key={`zone-${zone.id}`}
                            center={[zone.lat, zone.lng]}
                            pathOptions={{ fillColor: color, color: color }}
                            radius={zone.radius_km * 1000} 
                            stroke={false}
                            fillOpacity={0.2 + (zone.intensity / 300)}
                        >
                            <Tooltip direction="top" opacity={1} className="glass-popup bg-black/80 text-white border border-white/10 backdrop-blur-md rounded px-2 py-1">
                                <span className="font-bold tracking-wider">{zone.type} RISK</span>
                                <br/>Severity: {Math.round(zone.intensity)}%
                            </Tooltip>
                        </Circle>
                    );
                })}

                {shipments.map(shipment => {
                    let pathPos = [];
                    try {
                        let poly = shipment.activeRoutePolyline ? JSON.parse(shipment.activeRoutePolyline) : [];
                        pathPos = poly.map(p => [p.lat, p.lng]);
                    } catch(e) {}

                    return (
                        <React.Fragment key={`frag-${shipment.id}`}>
                            {/* Route Path line. Make dynamically red if risk is high or rerouted */}
                            {pathPos.length > 0 && (
                                <Polyline 
                                    positions={pathPos} 
                                    color={shipment.isRerouted ? '#4ade80' : '#3b82f6'} 
                                    weight={4}
                                    opacity={0.8}
                                    dashArray={shipment.isRerouted ? "10, 10" : ""}
                                />
                            )}
                            
                            {/* Live Vehicle Marker */}
                            {shipment.currentLat && shipment.currentLng && (
                                <Marker 
                                    position={[shipment.currentLat, shipment.currentLng]}
                                    icon={truckIcon}
                                >
                                    <Popup className="glass-popup border-none text-black font-semibold">
                                        TRK #{shipment.id} - {shipment.name}
                                    </Popup>
                                </Marker>
                            )}
                        </React.Fragment>
                    )
                })}
            </MapContainer>
        </div>
      </div>

      {/* OVERLAY: Public Simulation Console */}
      {isSimulatorOpen && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-center items-center">
          <div className="bg-[#0a0f1c]/90 border border-white/10 rounded-2xl w-full max-w-4xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <span className="w-3 h-8 bg-blue-500 rounded-full inline-block"></span> 
                  Live Simulation Console
                </h2>
                <button onClick={() => setIsSimulatorOpen(false)} className="text-gray-400 hover:text-white bg-white/5 rounded-full p-2">
                    <X className="w-5 h-5"/>
                </button>
            </div>

            {message && (
                <div className="bg-primary/20 border border-primary text-primary px-4 py-3 rounded-xl mb-6 flex animate-pulse items-center">
                    ⚡ {message}
                </div>
            )}

            <div className="glass-panel rounded-xl p-5 mb-6 border border-white/5 bg-white/5">
                <h3 className="text-lg font-semibold mb-3">Spawn New Tracking Shipment</h3>
                <form onSubmit={handleCreateShipment} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Cargo ID</label>
                        <input type="text" required value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. TRK-990" className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Origin</label>
                        <select value={newOrigin} onChange={e => setNewOrigin(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500">
                        {NODES.map(n => <option key={`orig-${n}`} value={n}>{n}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Destination</label>
                        <select value={newDestination} onChange={e => setNewDestination(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500">
                        {NODES.map(n => <option key={`dest-${n}`} value={n}>{n}</option>)}
                        </select>
                    </div>
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg border border-blue-400/50 transition-all">
                        Launch AI Route
                    </button>
                </form>
            </div>

            <div className="glass-panel rounded-xl p-5 border border-white/5 bg-white/5">
                <h3 className="text-lg font-semibold mb-4">Active Consignments ({shipments.length})</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 text-gray-400">
                                <th className="pb-2 pl-2">ID</th>
                                <th className="pb-2">Details</th>
                                <th className="pb-2">Route</th>
                                <th className="pb-2">Status</th>
                                <th className="pb-2 text-right pr-2">Total Risk</th>
                            </tr>
                        </thead>
                        <tbody>
                            {shipments.map(s => (
                                <tr key={s.id} className="border-b border-white/5 hover:bg-white/5">
                                    <td className="py-3 pl-2 font-mono text-gray-400">#{s.id}</td>
                                    <td className="py-3 font-semibold">{s.name}</td>
                                    <td className="py-3 text-gray-300">{s.origin} → {s.destination}</td>
                                    <td className="py-3">
                                        <span className={`px-2 py-1 text-xs font-bold rounded bg-slate-800 ${s.status === 'DELAYED' ? 'text-orange-400' : 'text-green-400'}`}>
                                            {s.status}
                                        </span>
                                    </td>
                                    <td className="py-3 pr-2 text-right">
                                        <span className={`font-bold ${s.riskScore > 50 ? 'text-red-400' : 'text-green-400'}`}>{s.riskScore}%</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
