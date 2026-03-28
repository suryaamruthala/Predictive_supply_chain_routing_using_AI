import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
    Home, Package, Activity, Bell, BarChart2, User, Settings, 
    ChevronLeft, ChevronRight, PlayCircle, CloudDrizzle, Navigation, 
    AlertTriangle, ShieldAlert, LogOut, CheckCircle2, AlertOctagon,
    Users, PieChart, Shield
} from 'lucide-react';
import { MapContainer, TileLayer, Circle, Polyline, Tooltip, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ShipmentManagement from './ShipmentManagement';
import UserManagementTab from './UserManagementTab';
import SettingsTab from './SettingsTab';
import toast, { Toaster } from 'react-hot-toast';
import { exportAnalyticsPDF } from '../utils/pdfReports';

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
        localStorage.removeItem('isAdmin');
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
        const res = await axios.post(`http://localhost:8080/api/shipments/${activeShip.id}/reroute`);
        const updatedShip = res.data;
        const risk = updatedShip?.riskScore ?? 0;

        if (risk > 30) {
            // Dismiss the loading toast first
            toast.dismiss(routeToast);
            const severity = risk > 60 ? 'CRITICAL' : risk > 45 ? 'HIGH' : 'MEDIUM';
            const severityColor = risk > 60 ? '#F44336' : risk > 45 ? '#FF9800' : '#FFB300';
            toast(
                (t) => (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <span style={{ fontSize: '20px', marginTop: '2px' }}>⚠️</span>
                        <div>
                            <div style={{ fontWeight: 'bold', color: severityColor, fontSize: '13px', marginBottom: '3px' }}>
                                [{severity}] HIGH-RISK ROUTE ALERT
                            </div>
                            <div style={{ fontSize: '12px', color: '#ccc' }}>
                                Admin-selected route for <strong style={{ color: '#fff' }}>{updatedShip.name}</strong> has a risk score of{' '}
                                <strong style={{ color: severityColor }}>{risk}%</strong> — exceeds 30% safety threshold.
                            </div>
                            <button
                                onClick={() => { toast.dismiss(t.id); setActiveTab('ALERTS'); fetchDbAlerts(); }}
                                style={{ marginTop: '8px', fontSize: '11px', background: severityColor + '22', border: `1px solid ${severityColor}55`, color: severityColor, padding: '3px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                View Alerts →
                            </button>
                        </div>
                    </div>
                ),
                { duration: 8000, style: { background: '#1C1F2B', border: `1px solid ${severityColor}55`, maxWidth: '420px' } }
            );
            addLog(`⚠ ALERT: Admin-selected route for ${updatedShip.name} has risk=${risk}% (>${30}% threshold). Alert logged to DB.`);
            // Auto-switch to Alerts tab and refresh
            setTimeout(() => { setActiveTab('ALERTS'); fetchDbAlerts(); }, 1200);
        } else {
            toast.success(`AI Reroute complete for ${activeShip.id}. Risk: ${risk}% (Safe).`, { id: routeToast });
            addLog(`SUCCESS: New coordinates dispatched to ${activeShip.id}. Risk=${risk}% — within safe threshold.`);
        }
        fetchDbAlerts();
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

  let maxW = 5, maxT = 5, maxG = 5, maxC = 5;
  heatmapZones.forEach(z => {
      if (z.type === 'WEATHER') maxW = Math.max(maxW, z.intensity);
      if (z.type === 'TRAFFIC') maxT = Math.max(maxT, z.intensity);
      if (z.type === 'GEOPOLITICAL') maxG = Math.max(maxG, z.intensity);
      if (z.type === 'CUSTOMS') maxC = Math.max(maxC, z.intensity);
  });
  
  const currentShip = shipments[0];

  const renderTabContent = () => {
      switch(activeTab) {
          case 'RISK':
              return (
                  <div className="flex-1 flex flex-col bg-[#1A1D27] rounded-lg border border-[#262A38] p-6 overflow-hidden">
                      <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#2A2E3E]">
                          <div className="flex items-center gap-3">
                              <Shield className="w-6 h-6 text-red-500"/>
                              <h2 className="text-xl font-bold text-gray-200">Live Risk Assessment Matrix</h2>
                          </div>
                          <span className={`text-xs px-3 py-1 rounded-full font-bold ${heatmapZones.length > 0 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                              {heatmapZones.length} Active Zones
                          </span>
                      </div>
                      <div className="flex-1 overflow-auto custom-scrollbar">
                          <table className="w-full text-sm">
                              <thead className="sticky top-0 bg-[#1C1F2B] z-10">
                                  <tr className="text-gray-400 text-xs uppercase tracking-wider border-b border-[#2A2E3E]">
                                      <th className="py-3 px-4 text-left">Zone ID</th>
                                      <th className="py-3 px-4 text-left">Type</th>
                                      <th className="py-3 px-4 text-left">Coordinates</th>
                                      <th className="py-3 px-4 text-left">Radius</th>
                                      <th className="py-3 px-4 text-left">Intensity</th>
                                      <th className="py-3 px-4 text-left">Threat Level</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-[#262A38]">
                                  {heatmapZones.length > 0 ? heatmapZones.map((zone, idx) => {
                                      const level = zone.intensity > 70 ? 'CRITICAL' : zone.intensity > 40 ? 'HIGH' : 'MEDIUM';
                                      const levelColor = zone.intensity > 70 ? 'text-red-400 bg-red-500/10 border-red-500/30' : zone.intensity > 40 ? 'text-orange-400 bg-orange-500/10 border-orange-500/30' : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
                                      const typeColor = zone.type === 'WEATHER' ? 'text-blue-400' : 
                                                         zone.type === 'TRAFFIC' ? 'text-yellow-400' : 
                                                         zone.type === 'CUSTOMS' ? 'text-indigo-400' : 
                                                         zone.type === 'GEOPOLITICAL' ? 'text-red-400' : 'text-gray-400';
                                      return (
                                          <tr key={idx} className="hover:bg-white/5 transition-colors group">
                                              <td className="py-3 px-4 font-mono text-gray-400 text-xs">{zone.id}</td>
                                              <td className={`py-3 px-4 font-bold ${typeColor}`}>{zone.type}</td>
                                              <td className="py-3 px-4 text-gray-400 text-xs font-mono">{zone.lat?.toFixed(2)}°, {zone.lng?.toFixed(2)}°</td>
                                              <td className="py-3 px-4 text-gray-300">{zone.radius_km} km</td>
                                              <td className="py-3 px-4">
                                                  <div className="flex items-center gap-2">
                                                      <div className="w-24 h-2 bg-[#262A38] rounded-full overflow-hidden">
                                                          <div className={`h-full rounded-full transition-all ${zone.intensity > 70 ? 'bg-red-500' : zone.intensity > 40 ? 'bg-orange-500' : 'bg-yellow-500'}`} style={{width: `${zone.intensity}%`}}></div>
                                                      </div>
                                                      <span className="text-gray-300 text-xs">{zone.intensity?.toFixed(0)}%</span>
                                                  </div>
                                              </td>
                                              <td className="py-3 px-4">
                                                  <span className={`text-xs font-bold px-2 py-1 rounded border ${levelColor}`}>{level}</span>
                                              </td>
                                          </tr>
                                      );
                                  }) : (
                                      <tr><td colSpan={6} className="py-12 text-center text-gray-500 italic">No active risk zones detected. System nominal.</td></tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>
              );
          case 'ALERTS':
              return (
                  <div className="flex-1 flex flex-col bg-[#1A1D27] rounded-lg border border-[#262A38] p-6 overflow-y-auto custom-scrollbar">
                      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#2A2E3E]">
                          <div className="flex items-center gap-4">
                              <AlertOctagon className="w-7 h-7 text-[#FF9800]" />
                              <h2 className="text-xl font-bold text-gray-200">Alert Management Gateway</h2>
                              <span className={`text-xs px-3 py-1 rounded-full font-bold ${allAlerts.length > 0 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                                  {allAlerts.length} {allAlerts.length === 1 ? 'Alert' : 'Alerts'}
                              </span>
                          </div>
                          {allAlerts.length > 0 && (
                              <button 
                                  onClick={async () => {
                                      const dbOnly = allAlerts.filter(a => a.id);
                                      if (dbOnly.length === 0) { toast('No stored alerts to dismiss.'); return; }
                                      const t = toast.loading(`Dismissing ${dbOnly.length} alert(s)...`);
                                      try {
                                          await Promise.all(dbOnly.map(a => axios.delete(`http://localhost:8080/api/alerts/${a.id}`)));
                                          toast.success(`${dbOnly.length} alert(s) permanently deleted.`, { id: t });
                                          fetchDbAlerts();
                                      } catch(e) { toast.error('Bulk dismiss failed.', { id: t }); }
                                  }}
                                  className="text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/30 hover:border-red-500/50 transition-colors flex items-center gap-2"
                              >
                                  <AlertTriangle className="w-3.5 h-3.5" /> Dismiss All
                              </button>
                          )}
                      </div>
                      <p className="text-xs text-gray-600 mb-4">Alerts are stored in the database. Dismissed alerts are permanently deleted.</p>
                      <div className="space-y-3 max-w-4xl">
                          {allAlerts.length > 0 ? allAlerts.map((alt, idx) => {
                              const severityColor = alt.severity === 'CRITICAL' 
                                  ? 'border-l-red-500 bg-red-500/5' 
                                  : alt.severity === 'HIGH' 
                                      ? 'border-l-orange-500 bg-orange-500/5' 
                                      : 'border-l-yellow-500 bg-yellow-500/5';
                              const severityBadge = alt.severity === 'CRITICAL'
                                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                  : alt.severity === 'HIGH'
                                      ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                      : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
                              const iconColor = alt.severity === 'CRITICAL' ? 'text-red-500' : alt.severity === 'HIGH' ? 'text-[#FF9800]' : 'text-yellow-500';
                              return (
                              <div key={idx} className={`border-l-4 ${severityColor} bg-[#242A38] border border-[#3A435A] p-4 rounded-lg flex items-start gap-4 hover:border-gray-500 transition-colors`}>
                                  <AlertTriangle className={`w-5 h-5 ${iconColor} mt-0.5 shrink-0`} />
                                  <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-3 mb-1">
                                          <h4 className="font-semibold text-gray-200 text-sm">Dispatch: {alt.cargo}</h4>
                                          {alt.severity && (
                                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${severityBadge}`}>
                                                  {alt.severity}
                                              </span>
                                          )}
                                      </div>
                                      <p className="text-gray-400 text-sm">{alt.msg}</p>
                                      {alt.id && <p className="text-gray-600 text-[10px] mt-1.5 font-mono">Alert ID: #{alt.id} • Stored in database</p>}
                                  </div>
                                  <button 
                                      onClick={(e) => { 
                                          e.stopPropagation(); 
                                          if (!alt.id) { toast('Alert acknowledged (not stored in DB).'); return; }
                                          handleDismissAlert(alt.id); 
                                      }} 
                                      className="text-xs font-semibold text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/30 px-4 py-2 rounded-lg border border-red-500/30 hover:border-red-500/50 transition-all shrink-0 flex items-center gap-1.5"
                                  >
                                      <AlertTriangle className="w-3 h-3" /> Dismiss
                                  </button>
                              </div>
                          )}) : (
                              <div className="text-center py-16 text-gray-500 italic">
                                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20 text-green-500"/>
                                  No alerts in the system. All dispatches running normally.
                              </div>
                          )}
                      </div>
                  </div>
              );
          case 'ANALYTICS':
              const statuses = ['IN_TRANSIT', 'DELAYED', 'REROUTED', 'DELIVERED'];
              const statusColors = {'IN_TRANSIT': '#4CAF50', 'DELAYED': '#F44336', 'REROUTED': '#FF9800', 'DELIVERED': '#2196F3'};
              const statusCounts = statuses.map(s => ({ label: s.replace('_',' '), count: shipments.filter(sh => sh.status === s).length, color: statusColors[s] }));
              const maxCount = Math.max(...statusCounts.map(s => s.count), 1);
              const avgRisk = shipments.length > 0 ? (shipments.reduce((a, s) => a + (s.riskScore || 0), 0) / shipments.length).toFixed(1) : 0;
              const rerouted = shipments.filter(s => s.isRerouted).length;
              return (
                  <div className="flex-1 flex flex-col gap-5 overflow-auto custom-scrollbar">
                      {/* KPI Strip */}
                      <div className="flex gap-4 h-[80px] shrink-0">
                          {[
                              { label: 'Total Dispatches', value: shipments.length, color: 'text-blue-400' },
                              { label: 'Avg. Risk Score', value: `${avgRisk}%`, color: avgRisk > 50 ? 'text-red-400' : 'text-green-400' },
                              { label: 'AI Reroutes Issued', value: rerouted, color: 'text-orange-400' },
                              { label: 'High Risk Zones', value: highRiskCount, color: 'text-red-400' },
                          ].map((kpi, i) => (
                              <div key={i} className="flex-1 bg-[#1A1D27] rounded-lg border border-[#262A38] flex flex-col items-start justify-center px-5 gap-1">
                                  <span className="text-xs text-gray-500 font-medium">{kpi.label}</span>
                                  <span className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</span>
                              </div>
                          ))}
                      </div>
                      {/* Charts Row */}
                      <div className="flex gap-5 flex-1 min-h-[300px]">
                          {/* Status Breakdown Bar Chart */}
                          <div className="flex-1 bg-[#1A1D27] rounded-lg border border-[#262A38] p-5">
                              <h3 className="text-gray-200 font-semibold mb-5 text-[15px]">Shipment Status Breakdown</h3>
                              <div className="flex items-end gap-4 h-40 px-4">
                                  {statusCounts.map((s, i) => (
                                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                          <span className="text-xs font-bold" style={{color: s.color}}>{s.count}</span>
                                          <div className="w-full rounded-t-md transition-all duration-700 hover:opacity-80 cursor-pointer"
                                               style={{height: `${(s.count / maxCount) * 120 + 4}px`, backgroundColor: s.color, opacity: 0.8}}
                                               onClick={() => toast(`${s.label}: ${s.count} shipments`)}></div>
                                          <span className="text-[10px] text-gray-500 text-center leading-tight">{s.label}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                          {/* Risk Distribution */}
                          <div className="flex-1 bg-[#1A1D27] rounded-lg border border-[#262A38] p-5">
                              <h3 className="text-gray-200 font-semibold mb-5 text-[15px]">Risk Score Distribution</h3>
                              <div className="space-y-3">
                                  {[{label: 'Low Risk (0–30)', count: shipments.filter(s=>(s.riskScore||0)<=30).length, color:'#4CAF50'},
                                    {label: 'Medium (31–60)', count: shipments.filter(s=>(s.riskScore||0)>30&&(s.riskScore||0)<=60).length, color:'#FF9800'},
                                    {label: 'High Risk (61–100)', count: shipments.filter(s=>(s.riskScore||0)>60).length, color:'#F44336'}
                                  ].map((r, i) => (
                                      <div key={i} className="flex items-center gap-3">
                                          <span className="text-xs text-gray-400 w-32 shrink-0">{r.label}</span>
                                          <div className="flex-1 h-5 bg-[#262A38] rounded-full overflow-hidden">
                                              <div className="h-full rounded-full transition-all duration-700" style={{width: `${shipments.length > 0 ? (r.count/shipments.length*100) : 0}%`, backgroundColor: r.color}}></div>
                                          </div>
                                          <span className="text-sm font-bold text-gray-300 w-6 text-right">{r.count}</span>
                                      </div>
                                  ))}
                              </div>
                              <button
                                onClick={() => {
                                    const t = toast.loading('Generating PDF report...');
                                    try {
                                        exportAnalyticsPDF({ shipments, heatmapZones, alerts: allAlerts, highRiskCount });
                                        toast.success('📄 Analytics PDF downloaded!', { id: t });
                                    } catch(e) {
                                        toast.error('PDF generation failed.', { id: t });
                                        console.error(e);
                                    }
                                }}
                                className="mt-6 w-full py-2 bg-[#4CAF50]/20 text-[#4CAF50] rounded border border-[#4CAF50]/40 hover:bg-[#4CAF50]/30 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                              >
                                📄 Export PDF Report
                              </button>
                          </div>
                      </div>
                  </div>
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
      {activeTab === 'SHIPMENTS' ? (
          <ShipmentManagement shipments={shipments} onRefresh={() => {
              axios.get('http://localhost:8080/api/shipments').then(r => { if(r.data) setShipments(r.data); });
          }} />
      ) : (
          <div className="flex-1 flex flex-col h-full bg-[#13151D] overflow-hidden">
              
              {/* HEADER ROW */}
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
              
              {activeTab === 'DASHBOARD' ? (
                  <>
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
                              <MapContainer center={[20.0, 78.0]} zoom={4} style={{ width: '100%', height: '100%' }} zoomControl={false}>
                                  {/* Using a dark satellite tile layer similar to the mockup */}
                                  <TileLayer 
                                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
                                      className="saturate-50 contrast-125 brightness-75 hue-rotate-15"
                                  />
                                  {/* Overlay Heatmaps */}
                                  {heatmapZones.map((zone) => {
                                      const isRed = zone.intensity > 60;
                                      const color = isRed ? '#F44336' : '#FF9800';
                                      return (
                                          <Circle key={`z-${zone.id}`} center={[zone.lat, zone.lng]} pathOptions={{ fillColor: color, color: color }} radius={zone.radius_km * 1000} stroke={false} fillOpacity={0.4}>
                                              <Tooltip direction="top" opacity={1} permanent className="bg-[#F44336] border-none text-white text-xs font-bold rounded shadow-lg">
                                                  {zone.type}
                                                  <div className="text-[9px] uppercase tracking-wider block border-t border-white/20 mt-1 pt-1 opacity-90">High Risk</div>
                                              </Tooltip>
                                          </Circle>
                                      );
                                  })}
                                  {/* Overlay Ships */}
                                  {shipments.map(s => {
                                      if(s.currentLat && s.currentLng) {
                                          return <Marker key={`shp-${s.id}`} position={[s.currentLat, s.currentLng]} icon={new L.DivIcon({ className: 'custom-icon', html: `<div class="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-lg cursor-pointer transition-transform hover:scale-125"></div>`})} eventHandlers={{ click: () => toast.success(`Ship ${s.id} Selected`) }} />
                                      }
                                      return null;
                                  })}
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
                         {/* Current Shipment */}
                         <div className="flex-1 bg-[#1A1D27] rounded-lg border border-[#262A38] p-5 flex flex-col shadow-xl">
                             <div className="flex justify-between items-center mb-4">
                                 <h3 className="text-gray-200 font-semibold text-[15px]">Active Focus Target</h3>
                                 <button onClick={() => setActiveTab('SHIPMENTS')} className="text-blue-400 hover:text-blue-300 text-xs font-medium">View All</button>
                             </div>
                             <div className="space-y-2.5 text-sm flex-1">
                                  {currentShip ? (
                                      <>
                                          <div className="flex"><span className="text-gray-500 w-[100px]">ID:</span> <span className="text-gray-300 font-medium cursor-pointer hover:text-blue-400" onClick={() => {navigator.clipboard.writeText(currentShip.id); toast.success('Copied Array ID: ' + currentShip.id)}}>#{currentShip.id}</span></div>
                                          <div className="flex"><span className="text-gray-500 w-[100px]">Cargo:</span> <span className="text-gray-300">{currentShip.name}</span></div>
                                          <div className="flex"><span className="text-gray-500 w-[100px]">Status:</span> <span className="text-[#4CAF50] font-bold tracking-wide text-[13px] uppercase">{currentShip.status}</span></div>
                                          <div className="flex"><span className="text-gray-500 w-[100px]">Risk Profile:</span> <span className={`${currentShip.riskScore > 50 ? 'text-red-400' : 'text-gray-300'}`}>{currentShip.riskScore}%</span></div>
                                          <div className="flex"><span className="text-gray-500 w-[100px]">Route:</span> <span className="text-gray-300 truncate pr-2">{currentShip.origin} to {currentShip.destination}</span></div>
                                      </>
                                  ) : (
                                      <div className="text-center text-gray-500 mt-4 text-xs italic">No active dispatch available.</div>
                                  )}
                             </div>
                         </div>
                         
                         {/* Risk Summary */}
                         <div className="flex-1 bg-[#1A1D27] rounded-lg border border-[#262A38] p-5 flex flex-col shadow-xl">
                             <h3 className="text-gray-200 font-semibold mb-3 text-[15px]">Risk Summary Matrix</h3>
                             <div className="flex flex-col gap-2 flex-1 justify-center">
                                  <div className="relative h-6 w-full bg-[#1e293b]/50 rounded overflow-hidden flex items-center justify-between px-3 border border-white/5 shadow-inner group">
                                      <div className="absolute left-0 top-0 bottom-0 bg-[#3B82F6]/60 rounded-r z-0 transition-all duration-1000" style={{width: `${Math.max(20, maxW)}%`}}></div>
                                      <span className="relative z-10 text-[11px] text-white font-medium drop-shadow-md">Weather Dynamics</span>
                                      <span className="relative z-10 text-[11px] text-blue-400 font-bold">{maxW.toFixed(0)}%</span>
                                  </div>
                                  <div className="relative h-6 w-full bg-[#1e293b]/50 rounded overflow-hidden flex items-center justify-between px-3 border border-white/5 shadow-inner group">
                                      <div className="absolute left-0 top-0 bottom-0 bg-[#EF4444]/60 rounded-r z-0 transition-all duration-1000" style={{width: `${Math.max(20, maxG)}%`}}></div>
                                      <span className="relative z-10 text-[11px] text-white font-medium drop-shadow-md">Geopolitical Friction</span>
                                      <span className="relative z-10 text-[11px] text-red-500 font-bold">{maxG.toFixed(0)}%</span>
                                  </div>
                                  <div className="relative h-6 w-full bg-[#1e293b]/50 rounded overflow-hidden flex items-center justify-between px-3 border border-white/5 shadow-inner group">
                                      <div className="absolute left-0 top-0 bottom-0 bg-[#818CF8]/60 rounded-r z-0 transition-all duration-1000" style={{width: `${Math.max(20, maxC)}%`}}></div>
                                      <span className="relative z-10 text-[11px] text-white font-medium drop-shadow-md">Customs & Compliance</span>
                                      <span className="relative z-10 text-[11px] text-indigo-400 font-bold">{maxC.toFixed(0)}%</span>
                                  </div>
                                  <div className="relative h-6 w-full bg-[#1e293b]/50 rounded overflow-hidden flex items-center justify-between px-3 border border-white/5 shadow-inner group">
                                      <div className="absolute left-0 top-0 bottom-0 bg-[#F59E0B]/60 rounded-r z-0 transition-all duration-1000" style={{width: `${Math.max(10, maxT)}%`}}></div>
                                      <span className="relative z-10 text-[11px] text-white font-medium drop-shadow-md">Routing Efficiency</span>
                                      <span className="relative z-10 text-[11px] text-yellow-500 font-bold">{maxT.toFixed(0)}%</span>
                                  </div>
                             </div>
                         </div>
                         
                         {/* Quick Actions */}
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
                  </>
             ) : (
                  renderTabContent()
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
