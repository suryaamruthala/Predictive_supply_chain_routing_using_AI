import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
    Home, Package, Activity, Bell, BarChart2, User, Settings, 
    Navigation, AlertTriangle, ShieldAlert, LogOut, CheckCircle2, 
    PlayCircle, CloudDrizzle
} from 'lucide-react';
import { MapContainer, TileLayer, Circle, Polyline, Tooltip, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ShipmentManagement from './ShipmentManagement';
import UserManagementTab from './UserManagementTab';
import SettingsTab from './SettingsTab';
import toast, { Toaster } from 'react-hot-toast'
import { exportAnalyticsPDF } from '../utils/pdfReports';

// New Tab Components
import AdminOverview from './tabs/admin/AdminOverview';
import AdminRiskMonitor from './tabs/admin/AdminRiskMonitor';
import AdminAlertManager from './tabs/admin/AdminAlertManager';
import AdminAnalytics from './tabs/admin/AdminAnalytics';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [shipments, setShipments] = useState([]);
  const [heatmapZones, setHeatmapZones] = useState([]);
  const [isAiPaused, setIsAiPaused] = useState(false);
  const [logs, setLogs] = useState(["[SYSTEM] AI Telemetry initialized...", "[SYSTEM] Awaiting command input..."]);
  const [dbAlerts, setDbAlerts] = useState([]);

  const addLog = (msg) => {
      const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second:'2-digit' });
      setLogs(prev => [...prev, `[${time}] ${msg}`].slice(-20));
  };

  const fetchDbAlerts = async () => {
      try {
          const res = await axios.get('http://localhost:8080/api/alerts');
          setDbAlerts(res.data || []);
      } catch(e) {}
  };

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        const response = await axios.get('http://localhost:8080/api/shipments');
        if (response.data && response.data.length > 0) setShipments(response.data);
      } catch (error) {}
    };
    
    const fetchZones = async () => {
         try {
            const res = await fetch('http://localhost:8000/api/heatmap');
            const data = await res.json();
            setHeatmapZones(data.zones || []);
         } catch(e) {}
    };

    if (!isAiPaused) {
        fetchShipments();
        fetchZones();
        fetchDbAlerts();
    }
    const interval = setInterval(() => { 
        if (!isAiPaused) {
            fetchShipments(); 
            fetchZones(); 
            fetchDbAlerts();
        }
    }, 3000);
    return () => clearInterval(interval);
  }, [isAiPaused]);

  const handleLogout = () => {
    toast.success('Logging out securely...');
    setTimeout(() => {
        sessionStorage.removeItem('isAdmin');
        navigate('/');
    }, 800);
  };

  const handleSimulateStorm = async () => {
    const simToast = toast.loading('Injecting storm anomaly + rerouting high-risk shipments...');
    addLog('INIT: Weather hazard simulation sequence executing...');
    try {
        // Step 1: Inject storm into AI heatmap
        await axios.post('http://localhost:8000/api/simulate/storm');
        addLog('SUCCESS: Storm anomaly injected into heatmap grid.');

        // Step 2: Trigger auto-reroute for all shipments with risk > 30 and save alerts to DB
        const rerouteRes = await axios.post('http://localhost:8080/api/alerts/storm-reroute');
        const count = rerouteRes.data?.reroutedCount || 0;
        toast.success(`Storm injected. ${count} high-risk dispatch(es) auto-rerouted.`, { id: simToast });
        addLog(`REROUTE: ${count} shipment(s) with risk > 30% automatically redirected to safe corridors.`);
        fetchDbAlerts();
    } catch(err) { 
        toast.error('Storm injection failed. Check services.', { id: simToast });
        addLog('ERROR: Simulation endpoint unavailable.');
        console.error(err); 
    }
  };

  const handleRouteChange = async () => {
    const activeShip = shipments[0];
    if (!activeShip) {
        toast.error('No active dispatch available for rerouting.');
        addLog('WARN: Reroute failed. No active dispatch found.');
        return;
    }
    const routeToast = toast.loading(`Recalculating route for ${activeShip.id}...`);
    addLog(`REROUTE: Executing autonomous reroute mapping for ${activeShip.id}...`);
    try {
        await axios.post(`http://localhost:8080/api/shipments/${activeShip.id}/reroute`);
        toast.success(`AI Reroute sequence initialized for ${activeShip.id}.`, { id: routeToast });
        addLog(`SUCCESS: New coordinates dispatched to ${activeShip.id}.`);
    } catch(err) { 
        toast.error('Route calculation failed.', { id: routeToast });
        addLog('ERROR: AI pathing service offline.');
        console.error(err); 
    }
  };

  const togglePauseAi = () => {
      const newState = !isAiPaused;
      setIsAiPaused(newState);
      if (newState) {
          toast('AI Telemetry Feed Paused.', { icon: '⏸️', style: { borderRadius: '10px', background: '#333', color: '#fff'} });
          addLog('HALT: Autonomous processing stream manually paused.');
      } else {
          toast.success('AI Telemetry Feed Resumed.', { style: { borderRadius: '10px', background: '#333', color: '#fff'} });
          addLog('RESUME: Master telemetry stream re-established.');
      }
  };

  const highRiskCount = heatmapZones.filter(z => z.intensity > 60).length || 3;
  
  const allAlerts = dbAlerts.map(a => ({ cargo: a.cargoName || a.shipmentId, msg: a.message, id: a.id, severity: a.severity }));

  const handleDismissAlert = async (alertId) => {
      if (!alertId) { toast('Alert acknowledged.'); return; }
      try {
          await axios.delete(`http://localhost:8080/api/alerts/${alertId}`);
          toast.success('Alert permanently dismissed.');
          fetchDbAlerts();
      } catch(e) { toast.error('Dismiss failed.'); }
  };

  let maxW = 5, maxT = 5, maxG = 5;
  heatmapZones.forEach(z => {
      if (z.type === 'WEATHER') maxW = Math.max(maxW, z.intensity);
      if (z.type === 'TRAFFIC') maxT = Math.max(maxT, z.intensity);
      if (z.type === 'GEOPOLITICAL') maxG = Math.max(maxG, z.intensity);
  });
  
  const currentShip = shipments[0];

  const renderTabContent = () => {
      switch(activeTab) {
          case 'DASHBOARD':
              return (
                   <AdminOverview 
                       shipments={shipments} 
                       heatmapZones={heatmapZones} 
                       allAlerts={allAlerts} 
                       highRiskCount={highRiskCount} 
                       currentShip={currentShip} 
                       isAiPaused={isAiPaused} 
                       handleSimulateStorm={handleSimulateStorm} 
                       handleRouteChange={handleRouteChange} 
                       togglePauseAi={togglePauseAi} 
                       setActiveTab={setActiveTab} 
                       logs={logs}
                       maxW={maxW}
                       maxG={maxG}
                       maxT={maxT}
                   />
              );
          case 'SHIPMENTS':
               return (
                   <ShipmentManagement 
                       shipments={shipments} 
                       onRefresh={() => {
                           axios.get('http://localhost:8080/api/shipments').then(r => { if(r.data) setShipments(r.data); });
                       }} 
                   />
               );
          case 'RISK':
              return <AdminRiskMonitor heatmapZones={heatmapZones} />;
          case 'ALERTS':
              return (
                  <AdminAlertManager 
                      allAlerts={allAlerts} 
                      fetchDbAlerts={fetchDbAlerts} 
                      handleDismissAlert={handleDismissAlert} 
                  />
              );
          case 'ANALYTICS':
              return (
                  <AdminAnalytics 
                      shipments={shipments} 
                      heatmapZones={heatmapZones} 
                      allAlerts={allAlerts} 
                      highRiskCount={highRiskCount} 
                  />
              );
          case 'USER_MANAGEMENT':
              return <UserManagementTab toast={toast} />;
          case 'SETTINGS':
              return <SettingsTab toast={toast} heatmapZones={heatmapZones} isAiPaused={isAiPaused} />;
          default:
              return (
                  <div className="flex-1 flex items-center justify-center bg-[#1A1D27] rounded-lg border border-[#262A38]">
                      <div className="text-center text-gray-500 max-w-sm">
                          <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-50 text-blue-500"/>
                          <h2 className="text-xl font-bold mb-2">Select a section</h2>
                          <p className="text-sm">Use the sidebar to navigate to any dashboard module.</p>
                      </div>
                  </div>
              );
      }
  };

  return (
    <div className="flex h-screen w-screen bg-[#13151D] text-gray-300 overflow-hidden font-sans">
      <Toaster position="top-right" toastOptions={{ className: 'text-sm font-medium bg-[#242A38] text-white border border-[#3A435A]', style: { background: '#242A38', color: '#fff', border: '1px solid #3A435A' }}} />
      {/* 20% LEFT SIDEBAR */}
      <div className="w-[280px] bg-[#1C1F2B] border-r border-[#2A2E3E] flex flex-col z-20 shadow-2xl shrink-0">
        {/* Top Branding */}
        <div className="h-[72px] flex items-center justify-between px-6 border-b border-[#2A2E3E] bg-[#161822]">
            <h1 className="text-[17px] font-bold text-white tracking-wide">Admin Dashboard</h1>
            <Settings onClick={() => setActiveTab('SETTINGS')} className="w-5 h-5 text-gray-400 cursor-pointer hover:text-white transition-colors" />
        </div>
        
        {/* Main Nav Links */}
        <div className="flex-1 py-6 px-4 space-y-1">
            <button onClick={() => setActiveTab('DASHBOARD')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors font-medium text-sm ${activeTab === 'DASHBOARD' ? 'bg-[#2B406A]/30 text-blue-400 border-l-4 border-blue-500 rounded-l-none' : 'text-gray-400 hover:bg-white/5 hover:text-white border-l-4 border-transparent'}`}>
                <Home className="w-5 h-5"/> Dashboard
            </button>
            <button onClick={() => setActiveTab('SHIPMENTS')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors font-medium text-sm ${activeTab === 'SHIPMENTS' ? 'bg-[#2B406A]/30 text-blue-400 border-l-4 border-blue-500 rounded-l-none' : 'text-gray-400 hover:bg-white/5 hover:text-white border-l-4 border-transparent'}`}>
                <Package className="w-5 h-5"/> Shipment Management
            </button>
            <button onClick={() => setActiveTab('RISK')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors font-medium text-sm ${activeTab === 'RISK' ? 'bg-[#2B406A]/30 text-blue-400 border-l-4 border-blue-500 rounded-l-none' : 'text-gray-400 hover:bg-white/5 hover:text-white border-l-4 border-transparent'}`}>
                <Activity className="w-5 h-5"/> Risk Monitoring
            </button>
            <button onClick={() => setActiveTab('ALERTS')} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors font-medium text-sm ${activeTab === 'ALERTS' ? 'bg-[#2B406A]/30 text-blue-400 border-l-4 border-blue-500 rounded-l-none' : 'text-gray-400 hover:bg-white/5 hover:text-white border-l-4 border-transparent'}`}>
                <div className="flex items-center gap-4">
                    <Bell className="w-5 h-5"/> Alert Management
                </div>
                {allAlerts.length > 0 && <span className="bg-[#E44B4B] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center justify-center">{allAlerts.length}</span>}
            </button>
            <button onClick={() => setActiveTab('ANALYTICS')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors font-medium text-sm ${activeTab === 'ANALYTICS' ? 'bg-[#2B406A]/30 text-blue-400 border-l-4 border-blue-500 rounded-l-none' : 'text-gray-400 hover:bg-white/5 hover:text-white border-l-4 border-transparent'}`}>
                <BarChart2 className="w-5 h-5"/> Analytics Panel
            </button>
        </div>

        {/* Bottom Spacer Line */}
        <div className="mx-8 border-t border-[#2A2E3E]"></div>

        {/* Bottom Nav Links */}
        <div className="py-6 px-4 space-y-1">
            <button onClick={() => setActiveTab('USER_MANAGEMENT')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors font-medium text-sm ${activeTab === 'USER_MANAGEMENT' ? 'bg-[#2B406A]/30 text-blue-400 border-l-4 border-blue-500 rounded-l-none' : 'text-gray-400 hover:bg-white/5 hover:text-white border-l-4 border-transparent'}`}>
                <User className="w-5 h-5"/> User Management
            </button>
            <button onClick={() => setActiveTab('SETTINGS')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors font-medium text-sm ${activeTab === 'SETTINGS' ? 'bg-[#2B406A]/30 text-blue-400 border-l-4 border-blue-500 rounded-l-none' : 'text-gray-400 hover:bg-white/5 hover:text-white border-l-4 border-transparent'}`}>
                <Settings className="w-5 h-5"/> Settings
            </button>
            <button onClick={handleLogout} className="w-full mt-2 flex items-center gap-4 px-4 py-3 rounded-lg transition-colors font-medium text-[#E44B4B]/80 text-sm hover:bg-[#E44B4B]/10 hover:text-[#E44B4B] border-l-4 border-transparent">
                <LogOut className="w-5 h-5"/> Encrypted Logout
            </button>
        </div>
      </div>

      {/* 80% RIGHT CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full bg-[#13151D] overflow-hidden">
          
          {/* HEADER ROW (Persistent) */}
          <div className="h-[72px] bg-[#1C1F2B] border-b border-[#2A2E3E] flex items-center justify-between px-8 shadow-sm shrink-0">
             <h2 className="text-[22px] text-gray-200 font-semibold tracking-wide">Global Unified Command</h2>
             <div className="flex items-center gap-6">
                 <div onClick={() => setActiveTab('ALERTS')} className="relative cursor-pointer hover:text-white text-gray-400 transition-colors">
                     <Bell className="w-5 h-5" />
                     {allAlerts.length > 0 && <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500"></div>}
                 </div>
                 <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab('USER_MANAGEMENT')}>
                    <div className="w-8 h-8 rounded-full bg-blue-500 overflow-hidden border border-gray-500 group-hover:border-white transition-colors">
                        <img src="https://i.pravatar.cc/100?img=11" alt="admin" className="w-full h-full object-cover" />
                    </div>
                 </div>
             </div>
          </div>

          {/* MAIN TAB CONTENT */}
          <div className="flex-1 overflow-auto p-6 flex flex-col gap-5 custom-scrollbar">
              {renderTabContent()}
          </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
