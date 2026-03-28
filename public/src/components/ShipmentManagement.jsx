import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Menu, Search, TriangleAlert, Briefcase, Package, CheckSquare, XSquare, X, Trash2, RefreshCw, MapPin, ToggleLeft, ToggleRight, AlertOctagon, ShieldAlert, Navigation, Plus, Calendar } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import toast from 'react-hot-toast';
import { exportShipmentPDF } from '../utils/pdfReports';

// Known city coordinates for fallback when no GPS/polyline data exists
const CITY_COORDS = {
    'Mumbai':      [19.0760, 72.8777],
    'Delhi':       [28.7041, 77.1025],
    'New Delhi':   [28.6139, 77.2090],
    'Chennai':     [13.0827, 80.2707],
    'Kolkata':     [22.5726, 88.3639],
    'Bangalore':   [12.9716, 77.5946],
    'Bengaluru':   [12.9716, 77.5946],
    'Hyderabad':   [17.3850, 78.4867],
    'Pune':        [18.5204, 73.8567],
    'Ahmedabad':   [23.0225, 72.5714],
    'Jaipur':      [26.9124, 75.7873],
    'Surat':       [21.1702, 72.8311],
    'Lucknow':     [26.8467, 80.9462],
    'Kanpur':      [26.4499, 80.3319],
    'Nagpur':      [21.1458, 79.0882],
    'Indore':      [22.7196, 75.8577],
    'Bhopal':      [23.2599, 77.4126],
    'Chandigarh':  [30.7333, 76.7794],
    'Patna':       [25.5941, 85.1376],
    'Vadodara':    [22.3072, 73.1812],
    'Coimbatore':  [11.0168, 76.9558],
    'Visakhapatnam': [17.6868, 83.2185],
    'Kochi':       [9.9312, 76.2673],
    'Thiruvananthapuram': [8.5241, 76.9366],
    'Bhubaneswar': [20.2961, 85.8245],
    'Guwahati':    [26.1445, 91.7362],
    'Ranchi':      [23.3441, 85.3096],
    'Amritsar':    [31.6340, 74.8723],
    'Agra':        [27.1767, 78.0081],
    'Varanasi':    [25.3176, 82.9739],
    'Srinagar':    [34.0837, 74.7973],
    'Jodhpur':     [26.2389, 73.0243],
    'Udaipur':     [24.5854, 73.7125],
    // International
    'Dubai':       [25.2048, 55.2708],
    'Singapore':   [1.3521, 103.8198],
    'London':      [51.5074, -0.1278],
    'New York':    [40.7128, -74.0060],
    'Los Angeles': [34.0522, -118.2437],
    'Hamburg':     [53.5511, 9.9937],
    'Port of Hamburg': [53.5511, 9.9937],
    'Arabian Sea': [15.0, 65.0],
    'Shanghai':    [31.2304, 121.4737],
    'Tokyo':       [35.6762, 139.6503],
    'Moscow':      [55.7558, 37.6173],
    'St. Petersburg': [59.9311, 30.3609],
    'Vladivostok': [43.1198, 131.8869],
};

const getCityCoords = (name) => {
    if (!name) return null;
    // Try exact match first, then partial
    if (CITY_COORDS[name]) return CITY_COORDS[name];
    const key = Object.keys(CITY_COORDS).find(k => name.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(name.toLowerCase()));
    return key ? CITY_COORDS[key] : null;
};

const getStatusColor = (status) => {
    if (!status) return 'bg-gray-600 text-white';
    switch(status.toUpperCase().replace('_',' ')) {
        case 'IN TRANSIT': return 'bg-[#31A25B] text-white';
        case 'DELAYED': return 'bg-[#DE4141] text-white';
        case 'DELIVERED': return 'bg-[#5EB663] text-white';
        case 'ON HOLD': return 'bg-[#F2A30F] text-white';
        case 'REROUTED': return 'bg-orange-500 text-white';
        default: return 'bg-gray-600 text-white';
    }
};

const normalizeStatus = (status) => status?.replace('_', ' ').toUpperCase() || '';

// Track overlay - fullscreen map displayed over the entire screen
const TrackModal = ({ shipment, onClose }) => {
    const [newsRisk, setNewsRisk] = useState(null);
    const [loadingNews, setLoadingNews] = useState(false);
    const [rerouteInfo, setRerouteInfo] = useState(null);
    const [panelOpen, setPanelOpen] = useState(true);
    const [showAlternative, setShowAlternative] = useState(true);
    const [selectedModeTab, setSelectedModeTab] = useState('OPTIMAL');

    const alternatives = React.useMemo(() => {
        if (!shipment.alternateRoutesData) return [];
        try {
            return JSON.parse(shipment.alternateRoutesData);
        } catch(e) { return []; }
    }, [shipment.alternateRoutesData]);

    const activeData = React.useMemo(() => {
        if (selectedModeTab === 'OPTIMAL') {
            return {
                mode: shipment.transportMode || 'ROAD',
                polylineRaw: shipment.activeRoutePolyline,
                risk: shipment.risk || 0,
                cost: shipment.totalCostInr || 0,
                carbon: shipment.carbonEmissions || 0,
                status: shipment.status || 'SAFE',
                justification: shipment.modeJustification || 'Optimized for standard domestic transit.'
            };
        }
        const alt = alternatives.find(a => a.mode === selectedModeTab);
        if (alt) {
            return {
                mode: alt.mode,
                polylineRaw: JSON.stringify(alt.polyline),
                risk: alt.total_risk,
                cost: alt.total_cost_inr,
                carbon: alt.carbon_emissions_kg,
                status: alt.status,
                justification: `${parseFloat(alt.total_distance).toFixed(0)}km calculated for ${alt.mode} alternate path.`
            };
        }
        return { mode: 'ROAD', risk: 0, cost: 0, carbon: 0, status: 'SAFE' };
    }, [selectedModeTab, shipment, alternatives]);

    React.useEffect(() => {
        const checkNewsRisk = async () => {
            if (!shipment.origin || !shipment.destination) return;
            setLoadingNews(true);
            try {
                const res = await axios.post('http://localhost:8000/api/news-risk', {
                    origin: shipment.origin,
                    destination: shipment.destination
                });
                setNewsRisk(res.data);
                if (res.data.should_avoid_route) {
                    try {
                        await axios.post(`http://localhost:8080/api/shipments/${shipment.rawId}/reroute`);
                        setRerouteInfo('AI has automatically calculated an alternate safe route to avoid conflict zones.');
                        toast.success('Conflict detected! AI rerouted to safe corridor.', { duration: 5000 });
                    } catch(e) {}
                }
            } catch(e) {} finally {
                setLoadingNews(false);
            }
        };
        checkNewsRisk();
    }, [shipment.origin, shipment.destination, shipment.rawId]);

    // Close on Escape key
    React.useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const getModeIcon = (mode) => {
        if (mode === 'AIR') return '✈️';
        if (mode === 'WATER') return '🚢';
        return '🚛';
    };

    const originCoords  = getCityCoords(shipment.origin);
    const destCoords    = getCityCoords(shipment.destination);

    // ── Build the ACTIVE (optimal/selected) route positions ──────────────────
    let routePositions = [];
    try {
        if (activeData.polylineRaw) {
            routePositions = JSON.parse(activeData.polylineRaw).map(p => [p.lat, p.lng]);
        }
    } catch(e) {}

    // Fallback: generate a smooth arc between origin and destination
    let estimatedRoute = [];
    if (routePositions.length === 0 && originCoords && destCoords) {
        estimatedRoute = Array.from({ length: 8 }, (_, i) => {
            const t = i / 7;
            const lat = originCoords[0] + (destCoords[0] - originCoords[0]) * t;
            const lng = originCoords[1] + (destCoords[1] - originCoords[1]) * t;
            const arc = Math.sin(t * Math.PI) * 1.5;
            return [lat + arc * 0.3, lng - arc * 0.2];
        });
    }
    const activeRoute = routePositions.length > 0 ? routePositions : estimatedRoute;

    // ── Build the DEFAULT (original / risky) route ───────────────────────────
    // Priority: standardRoutePolyline → rerouteAlertData.standardRoute → synthesise from city coords
    let rerouteData = null;
    try {
        rerouteData = typeof shipment.rerouteAlertData === 'string'
            ? JSON.parse(shipment.rerouteAlertData)
            : shipment.rerouteAlertData;
    } catch(e) {}

    let standardRoute = [];
    try {
        if (shipment.standardRoutePolyline) {
            standardRoute = JSON.parse(shipment.standardRoutePolyline).map(p => [p.lat, p.lng]);
        } else if (rerouteData?.standardRoute?.length) {
            standardRoute = rerouteData.standardRoute.map(p => [p.lat, p.lng]);
        }
    } catch(e) {}

    // If there is a risk / reroute but no stored standard route, synthesise one:
    // Draw a more-direct (slightly different arc) path to visually contrast with the AI re-route.
    const hasRisk = (shipment.risk > 30 || shipment.isRerouted);
    let syntheticDefaultRoute = [];
    if (hasRisk && standardRoute.length === 0 && originCoords && destCoords) {
        syntheticDefaultRoute = Array.from({ length: 8 }, (_, i) => {
            const t = i / 7;
            const lat = originCoords[0] + (destCoords[0] - originCoords[0]) * t;
            const lng = originCoords[1] + (destCoords[1] - originCoords[1]) * t;
            // Opposite-side arc so it is visibly different from the AI route
            const arc = Math.sin(t * Math.PI) * 1.5;
            return [lat - arc * 0.35, lng + arc * 0.25];
        });
    }
    // Whichever source we use, this is the "default / original" route shown in pink/red
    const defaultRouteToShow = standardRoute.length > 0 ? standardRoute : syntheticDefaultRoute;

    const livePos = shipment.currentLat && shipment.currentLng
        ? { lat: shipment.currentLat, lng: shipment.currentLng, source: 'live' }
        : activeRoute.length > 0
            ? { lat: activeRoute[0][0], lng: activeRoute[0][1], source: routePositions.length > 0 ? 'route' : 'estimated' }
            : originCoords
                ? { lat: originCoords[0], lng: originCoords[1], source: 'city' }
                : null;
    const hasPosition = !!livePos;
    const center = hasPosition ? [livePos.lat, livePos.lng] : destCoords ?? [20.0, 78.0];
    const zoomLevel = hasPosition ? 6 : (originCoords ? 5 : 4);

    // Animated pulse CSS for vehicle marker
    const pulseStyle = `
        @keyframes trackPulse {
            0% { box-shadow: 0 0 0 0 rgba(59,130,246,0.6); }
            70% { box-shadow: 0 0 0 20px rgba(59,130,246,0); }
            100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
        }
    `;

    return (
        <div className="fixed inset-0 z-[9999]" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {/* Inline animation styles */}
            <style>{`
                ${pulseStyle}
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
                .track-panel-enter { animation: slideInRight 0.35s cubic-bezier(0.22,1,0.36,1) forwards; }
            `}</style>

            {/* Full-viewport map background */}
            <div className="absolute inset-0">
                <MapContainer center={center} zoom={zoomLevel} style={{ width: '100%', height: '100%' }} zoomControl={true}>
                    <TileLayer url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png" />

                    {/* ── DEFAULT / ORIGINAL ROUTE (risky) ───────────────────────────── */}
                    {/* Always shown when risk > 30 or rerouted, regardless of whether we have
                        stored polyline data or are using a synthesised fallback path. */}
                    {hasRisk && showAlternative && defaultRouteToShow.length > 0 && (
                        <>
                            {/* Glowing glow underlay for the risky route */}
                            <Polyline
                                positions={defaultRouteToShow}
                                color="#EC4899"
                                weight={8}
                                opacity={0.15}
                            />
                            <Polyline
                                positions={defaultRouteToShow}
                                color="#EC4899"
                                weight={3}
                                opacity={0.75}
                                dashArray="8, 10"
                            >
                                <Tooltip
                                    sticky
                                    direction="top"
                                    className="bg-[#1C1F2B] border border-pink-500/40 text-pink-400 text-[10px] font-bold px-2 py-1 rounded"
                                >
                                    ⚠️ Default Route (Risky)
                                </Tooltip>
                            </Polyline>
                        </>
                    )}

                    {/* ── AI OPTIMAL / ALTERNATE ROUTE ──────────────────────────────── */}
                    {activeRoute.length > 0 && (
                        <>
                            {/* Glow underlay */}
                            <Polyline
                                positions={activeRoute}
                                color={rerouteInfo || shipment.isRerouted ? '#22D3EE' : '#3B82F6'}
                                weight={10}
                                opacity={0.12}
                            />
                            <Polyline
                                positions={activeRoute}
                                color={rerouteInfo || shipment.isRerouted ? '#22D3EE' : '#3B82F6'}
                                weight={5}
                                opacity={0.95}
                                dashArray={routePositions.length === 0 ? '12,6' : ''}
                            >
                                <Tooltip
                                    sticky
                                    direction="top"
                                    className="bg-[#1C1F2B] border border-cyan-500/30 text-cyan-400 text-[10px] font-bold px-2 py-1 rounded"
                                >
                                    ✅ AI Optimized Route (Safe)
                                </Tooltip>
                            </Polyline>
                        </>
                    )}

                    {/* Origin marker */}
                    {originCoords && (
                        <Marker position={originCoords}
                            icon={new L.DivIcon({ className: '', html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:linear-gradient(135deg,#A78BFA,#7C3AED);border:3px solid white;border-radius:50%;box-shadow:0 0 16px rgba(167,139,250,0.6);font-size:12px;">📍</div>` })}>
                            <Popup><b>{shipment.origin}</b><br/>🟣 Origin</Popup>
                        </Marker>
                    )}

                    {/* Destination marker */}
                    {destCoords && (
                        <Marker position={destCoords}
                            icon={new L.DivIcon({ className: '', html: `<div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:linear-gradient(135deg,#34D399,#059669);border:3px solid white;border-radius:50%;box-shadow:0 0 16px rgba(52,211,153,0.6);font-size:12px;">🏁</div>` })}>
                            <Popup><b>{shipment.destination}</b><br/>🟢 Destination</Popup>
                        </Marker>
                    )}

                    {/* Live vehicle marker with pulsing animation */}
                    {hasPosition && (
                        <Marker position={[livePos.lat, livePos.lng]}
                            icon={new L.DivIcon({ className: '', html: `<div style="width:48px;height:48px;background:${
                                livePos.source === 'live'      ? 'linear-gradient(135deg,#3B82F6,#1D4ED8)'  :
                                livePos.source === 'route'     ? 'linear-gradient(135deg,#F59E0B,#D97706)'   :
                                                                   'linear-gradient(135deg,#8B5CF6,#6D28D9)'
                            };border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;animation:trackPulse 2s infinite;box-shadow:0 4px 20px rgba(0,0,0,0.4);">${getModeIcon(shipment.transportMode)}</div>` })}>
                            <Popup>
                                <div style={{minWidth: '160px'}}>
                                    <b style={{fontSize: '14px'}}>{shipment.id}</b><br/>
                                    <span style={{color: '#666'}}>Mode:</span> {activeData.mode}<br/>
                                    <span style={{color: '#666'}}>Efficiency:</span> ₹{new Intl.NumberFormat('en-IN').format(Math.round(activeData.cost || 0))}<br/>
                                    <span style={{color: '#666'}}>Risk:</span> <span style={{color: activeData.risk > 50 ? '#E44B4B' : '#4CAF50'}}>{activeData.risk.toFixed(0)}%</span><br/>
                                    <span style={{color: '#666'}}>Signal:</span> {livePos.source === 'live' ? '📡 Live GPS' : livePos.source === 'route' ? '📍 Route start' : '🗺️ Estimated'}
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Conflict/risk zone circles */}
                    {newsRisk?.detected_risks?.map((r, i) => (
                        r.affected_cities?.map((city, j) => {
                            const coords = getCityCoords(city);
                            if (!coords) return null;
                            return <Circle key={`${i}-${j}`} center={coords} radius={150000} pathOptions={{ color:'#E44B4B', fillColor:'#E44B4B', fillOpacity:0.15, weight: 2 }}/>;
                        })
                    ))}
                </MapContainer>
            </div>

            {/* ── Float Legend — Bottom Left ──────────────────────────────────── */}
            <div className="absolute bottom-24 left-6 z-[10000] bg-[#0D0F18]/90 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl flex flex-col gap-2.5" style={{minWidth:'200px'}}>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Route Intelligence</p>

                {/* Default route legend item */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5">
                        <div className="w-3 h-0.5 bg-pink-500" />
                        <div className="w-1 h-0.5 bg-transparent" />
                        <div className="w-3 h-0.5 bg-pink-500" />
                        <div className="w-1 h-0.5 bg-transparent" />
                        <div className="w-2 h-0.5 bg-pink-500" />
                    </div>
                    <span className="text-[11px] text-pink-300 font-semibold">⚠️ Default Route (Risk)</span>
                </div>

                {/* AI route legend item */}
                <div className="flex items-center gap-3">
                    <div className="w-9 h-1 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" />
                    <span className="text-[11px] text-cyan-300 font-semibold">✅ AI Alternate Route</span>
                </div>

                {hasRisk && (
                    <>
                        <div className="border-t border-white/5 pt-2 mt-0.5">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Risk Detected</span>
                            </div>
                            <p className="text-[10px] text-gray-500 leading-relaxed">
                                AI has calculated a safer alternate corridor to bypass the risk zone.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowAlternative(!showAlternative)}
                            className={`mt-1 text-[10px] py-1.5 px-2 rounded border transition-all font-semibold ${
                                showAlternative
                                    ? 'bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border-pink-500/20'
                                    : 'bg-white/5 hover:bg-white/10 text-gray-400 border-white/5'
                            }`}
                        >
                            {showAlternative ? '👁 Hide Default Route' : '👁 Show Default Route'}
                        </button>
                    </>
                )}
            </div>

            {/* Top bar - floating over map */}
            <div className="absolute top-0 left-0 right-0 z-[10000] flex items-center justify-between px-6 py-4 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-3 bg-[#0D0F18]/90 backdrop-blur-xl border border-white/10 rounded-xl px-5 py-3 shadow-2xl">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-white font-bold text-lg">Live Tracking</span>
                    <span className="text-gray-400 mx-2">|</span>
                    <span className="text-blue-400 font-mono font-bold">{shipment.id}</span>
                    {shipment.name && <span className="text-gray-500 text-sm">— {shipment.name}</span>}
                </div>
                <div className="pointer-events-auto flex items-center gap-2">
                    <button
                        onClick={() => setPanelOpen(p => !p)}
                        className="bg-[#0D0F18]/90 backdrop-blur-xl border border-white/10 text-gray-300 hover:text-white px-4 py-2.5 rounded-xl transition-all text-sm font-medium flex items-center gap-2 shadow-xl"
                    >
                        <Menu className="w-4 h-4" />
                        {panelOpen ? 'Hide Info' : 'Show Info'}
                    </button>
                    <button
                        onClick={onClose}
                        className="bg-red-500/20 backdrop-blur-xl border border-red-500/30 text-red-400 hover:text-red-300 hover:bg-red-500/30 p-2.5 rounded-xl transition-all shadow-xl"
                        title="Close tracking (Esc)"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Side info panel - slides in from right */}
            {panelOpen && (
                <div className="absolute top-20 right-6 bottom-6 w-[380px] z-[10000] track-panel-enter flex flex-col gap-4 overflow-y-auto custom-scrollbar pointer-events-auto">

                    {/* Shipment details card */}
                    <div className="bg-[#0D0F18]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-white/8 flex items-center gap-3">
                            <MapPin className="w-5 h-5 text-blue-400" />
                            <div>
                                <h3 className="font-bold text-white text-sm">Shipment Details</h3>
                                <p className="text-gray-500 text-xs">{shipment.origin} → {shipment.destination}</p>
                            </div>
                        </div>
                        <div className="p-5 flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                                    <p className="text-gray-500 text-[10px] uppercase tracking-wider font-bold mb-1">Status</p>
                                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${getStatusColor(shipment.status)}`}>{shipment.status}</span>
                                </div>
                                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                                    <p className="text-gray-500 text-[10px] uppercase tracking-wider font-bold mb-1">ETA</p>
                                    <p className="text-white font-semibold text-sm">{shipment.eta}</p>
                                </div>
                            </div>

                            {/* Risk score */}
                            <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-gray-400 text-xs font-bold flex items-center gap-1.5">
                                        {activeData.risk > 50 ? <TriangleAlert className="w-3.5 h-3.5 text-red-400" /> : <ShieldAlert className="w-3.5 h-3.5 text-green-400" />}
                                        Risk Score
                                    </p>
                                    <span className={`text-xl font-bold ${activeData.risk > 60 ? 'text-red-400' : activeData.risk > 30 ? 'text-orange-400' : 'text-green-400'}`}>
                                        {activeData.risk.toFixed(0)}%
                                    </span>
                                </div>
                                <div className="w-full bg-[#1A1D27] rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full transition-all duration-700 ${activeData.risk > 60 ? 'bg-gradient-to-r from-red-500 to-red-400' : activeData.risk > 30 ? 'bg-gradient-to-r from-orange-500 to-yellow-400' : 'bg-gradient-to-r from-green-500 to-emerald-400'}`}
                                        style={{ width: `${Math.min(100, activeData.risk)}%` }}
                                    />
                                </div>
                            </div>

                            {shipment.isRerouted && (
                                <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 px-3 py-2.5 rounded-lg text-xs text-orange-400">
                                    <Navigation className="w-3.5 h-3.5 shrink-0" /> AI Rerouted — Alternate path active
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Route Comparison Card (shown when risk > 30 or rerouted) ── */}
                    {hasRisk && (
                        <div className="bg-[#0D0F18]/90 backdrop-blur-xl border border-orange-500/20 rounded-xl shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="px-4 py-3 bg-gradient-to-r from-orange-500/10 to-red-500/5 border-b border-orange-500/15 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                                <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Route Intelligence — Risk Detected</p>
                            </div>
                            <div className="p-4 flex flex-col gap-3">

                                {/* Default Route row */}
                                <div className="bg-pink-500/5 border border-pink-500/20 rounded-lg p-3 flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="flex gap-0.5 items-center">
                                                <div className="w-4 h-0.5 bg-pink-400" />
                                                <div className="w-1 h-0.5 bg-transparent" />
                                                <div className="w-2 h-0.5 bg-pink-400" />
                                            </div>
                                            <span className="text-[11px] font-bold text-pink-300">Default Route</span>
                                        </div>
                                        <span className="text-[9px] bg-pink-500/20 text-pink-400 border border-pink-500/30 px-2 py-0.5 rounded font-bold uppercase">⚠ RISKY</span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 leading-relaxed">
                                        Original path — currently flagged with <span className="text-pink-400 font-semibold">{activeData.risk.toFixed(0)}% risk severity</span>. Exposure to disruption zones along this corridor.
                                    </p>
                                    <div className="flex items-center gap-1 text-[10px] text-pink-400/70 italic">
                                        <span>🗺️</span>
                                        <span>{shipment.origin} → {shipment.destination} (direct)</span>
                                    </div>
                                </div>

                                {/* Divider arrow */}
                                <div className="flex items-center justify-center gap-2">
                                    <div className="flex-1 border-t border-dashed border-white/10" />
                                    <span className="text-[10px] text-gray-600 font-bold">AI REROUTED TO</span>
                                    <div className="flex-1 border-t border-dashed border-white/10" />
                                </div>

                                {/* AI Alternate Route row */}
                                <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3 flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-1 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" />
                                            <span className="text-[11px] font-bold text-cyan-300">AI Alternate Route</span>
                                        </div>
                                        <span className="text-[9px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded font-bold uppercase">✓ SAFE</span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 leading-relaxed">
                                        AI-optimized detour bypassing high-risk zones. Estimated cost <span className="text-cyan-400 font-semibold">₹{new Intl.NumberFormat('en-IN').format(Math.round(activeData.cost || 0))}</span>.
                                    </p>
                                    <div className="flex items-center gap-1 text-[10px] text-cyan-400/70 italic">
                                        <span>🤖</span>
                                        <span>{activeData.mode} mode — carbon: {(activeData.carbon || 0).toFixed(1)} kg CO₂</span>
                                    </div>
                                </div>

                                {/* Toggle button */}
                                <button
                                    onClick={() => setShowAlternative(!showAlternative)}
                                    className={`w-full text-[10px] py-2 rounded-lg border transition-all font-bold flex items-center justify-center gap-1.5 ${
                                        showAlternative
                                            ? 'bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border-pink-500/20'
                                            : 'bg-white/5 hover:bg-white/10 text-gray-400 border-white/5'
                                    }`}
                                >
                                    👁 {showAlternative ? 'Hide Default (Risky) Route on Map' : 'Show Default (Risky) Route on Map'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Multi-modal Tabs */}
                    {alternatives.length > 0 && (
                        <div className="bg-[#0D0F18]/90 backdrop-blur-xl border border-white/10 rounded-xl p-2 shadow-2xl flex gap-1 mb-2">
                            <button
                                onClick={() => setSelectedModeTab('OPTIMAL')}
                                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${selectedModeTab === 'OPTIMAL' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                            >
                                <RefreshCw className={`w-3 h-3 ${selectedModeTab === 'OPTIMAL' ? 'text-blue-200' : 'opacity-50'}`} /> OPTIMAL
                            </button>
                            {alternatives.map(alt => (
                                <button
                                    key={alt.mode}
                                    onClick={() => setSelectedModeTab(alt.mode)}
                                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all uppercase flex items-center justify-center gap-1.5 ${selectedModeTab === alt.mode ? 'bg-white/10 text-white shadow-inner border border-white/5' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                >
                                    <span>{getModeIcon(alt.mode)}</span> {alt.mode}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* AI Decision Card (Multi-modal cost selection) */}
                    <div className="bg-[#0D0F18]/90 backdrop-blur-xl border border-blue-500/20 rounded-xl shadow-2xl p-5 mb-4 border-t border-t-blue-500/30">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-lg">
                                    {getModeIcon(activeData.mode)}
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{selectedModeTab === 'OPTIMAL' ? 'AI Decision Engine' : 'Alternate Selection'}</p>
                                    <h4 className="text-white font-bold">{activeData.mode} ROUTING</h4>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Route Efficiency</p>
                                <p className="text-green-400 font-bold text-sm">₹{new Intl.NumberFormat('en-IN').format(Math.round(activeData.cost || 0))}</p>
                            </div>
                        </div>
                        <div className="p-3 bg-white/5 rounded-lg border border-white/5 mb-3">
                             <p className="text-[11px] text-gray-300 leading-relaxed italic">
                                "{activeData.justification}"
                             </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#13151D] p-3 rounded-lg border border-white/5">
                                <p className="text-[9px] font-bold text-gray-500 uppercase mb-1">Risk Profile</p>
                                <p className={`text-xs font-bold ${activeData.risk > 40 ? 'text-orange-400' : 'text-green-400'}`}>
                                    {activeData.risk.toFixed(0)}% SEVERITY
                                </p>
                            </div>
                            <div className="bg-[#13151D] p-3 rounded-lg border border-white/5">
                                <p className="text-[9px] font-bold text-gray-500 uppercase mb-1">Carbon Index</p>
                                <p className="text-xs font-bold text-blue-400">
                                    {(activeData.carbon || 0).toFixed(1)} KG CO2
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#0D0F18]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-4">
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/5">
                            <span className="text-xs font-bold text-gray-200">Current Geolocation</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${livePos.source === 'live' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                {livePos.source.toUpperCase()}
                            </span>
                        </div>
                        {hasPosition ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-gray-500">Latitude</span>
                                    <span className="text-gray-300 font-mono">{livePos.lat.toFixed(6)}°</span>
                                </div>
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-gray-500">Longitude</span>
                                    <span className="text-gray-300 font-mono">{livePos.lng.toFixed(6)}°</span>
                                </div>
                                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                                    <span className="text-[10px] text-gray-500">Last Telemetry Check</span>
                                    <span className={`text-xs font-semibold ${livePos.source === 'live' ? 'text-green-400' : livePos.source === 'route' ? 'text-orange-400' : 'text-purple-400'}`}>
                                        {livePos.source === 'live' ? '📡 Live GPS' : livePos.source === 'route' ? '📍 Route Start' : '🗺️ Estimated'}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-red-400/70 text-xs">No GPS or city data available</p>
                        )}
                    </div>

                    {/* News risk card */}
                    {loadingNews && (
                        <div className="bg-[#0D0F18]/90 backdrop-blur-xl border border-blue-500/20 rounded-xl shadow-2xl p-5 flex items-center gap-3">
                            <RefreshCw className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
                            <p className="text-xs text-blue-400">Analyzing geopolitical risks...</p>
                        </div>
                    )}
                    {newsRisk && newsRisk.detected_risks?.length > 0 && (
                        <div className={`bg-[#0D0F18]/90 backdrop-blur-xl border rounded-xl shadow-2xl p-5 ${newsRisk.should_avoid_route ? 'border-red-500/30' : 'border-orange-500/30'}`}>
                            <div className="flex items-start gap-2 mb-3">
                                <AlertOctagon className={`w-4 h-4 mt-0.5 shrink-0 ${newsRisk.should_avoid_route ? 'text-red-400' : 'text-orange-400'}`} />
                                <p className={`text-xs font-bold ${newsRisk.should_avoid_route ? 'text-red-400' : 'text-orange-400'}`}>
                                    {newsRisk.should_avoid_route ? '⚠️ CONFLICT ZONE' : '⚠️ ELEVATED RISK'}
                                </p>
                            </div>
                            <p className="text-xs text-gray-400 mb-2">{newsRisk.recommendation}</p>
                            {newsRisk.detected_risks.map((r, i) => (
                                <p key={i} className="text-xs text-gray-500 mt-1">• {r.headline} ({r.risk_score}%)</p>
                            ))}
                            {rerouteInfo && (
                                <div className="mt-3 flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                                    <Navigation className="w-3 h-3" /> {rerouteInfo}
                                </div>
                            )}
                        </div>
                    )}
                    {newsRisk && newsRisk.detected_risks?.length === 0 && !loadingNews && (
                        <div className="bg-[#0D0F18]/90 backdrop-blur-xl border border-green-500/20 rounded-xl shadow-2xl p-5 flex items-center gap-3">
                            <ShieldAlert className="w-4 h-4 text-green-400 shrink-0" />
                            <p className="text-xs text-green-400">{newsRisk.recommendation}</p>
                        </div>
                    )}

                    {/* Close button at bottom of panel */}
                    <button
                        onClick={onClose}
                        className="w-full bg-[#0D0F18]/90 backdrop-blur-xl border border-white/10 text-gray-300 hover:text-white py-3 rounded-xl transition-all text-sm font-semibold flex items-center justify-center gap-2 shadow-xl hover:bg-white/10"
                    >
                        <X className="w-4 h-4" /> Close Tracking View
                    </button>
                </div>
            )}

            {/* Bottom status bar */}
            <div className="absolute bottom-0 left-0 right-0 z-[10000] pointer-events-none">
                <div className="mx-6 mb-6 pointer-events-auto bg-[#0D0F18]/90 backdrop-blur-xl border border-white/10 rounded-xl px-6 py-3 shadow-2xl flex items-center justify-between" style={{ maxWidth: panelOpen ? 'calc(100% - 420px)' : '100%' }}>
                    <div className="flex items-center gap-6 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-purple-500 border-2 border-white shadow" />
                            <span className="text-gray-400">{shipment.origin}</span>
                        </div>
                        <div className="text-gray-600">→→→</div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow" />
                            <span className="text-gray-400">{shipment.destination}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Risk: <strong className={activeData.risk > 50 ? 'text-red-400' : 'text-green-400'}>{activeData.risk.toFixed(0)}%</strong></span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(activeData.status)}`}>{activeData.status}</span>
                        <kbd className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-gray-500 font-mono">ESC</kbd>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AddShipmentModal = ({ onClose, onRefresh, onAutoTrack }) => {
    const [formData, setFormData] = useState({
        name: '',
        origin: '',
        destination: '',
        estimatedDelivery: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.origin || !formData.destination) {
            toast.error('Please fill in all required fields.');
            return;
        }

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
            if (onAutoTrack) {
                // Map raw backend format to frontend UI format for TrackModal
                const mapped = {
                    id: `SHP${newShipment.id}`,
                    rawId: newShipment.id,
                    name: newShipment.name,
                    origin: newShipment.origin,
                    destination: newShipment.destination,
                    status: newShipment.status,
                    risk: newShipment.riskScore ?? 0,
                    activeRoutePolyline: newShipment.activeRoutePolyline,
                    standardRoutePolyline: newShipment.standardRoutePolyline,
                    alternateRoutesData: newShipment.alternateRoutesData,
                    transportMode: newShipment.transportMode,
                    totalCostInr: newShipment.totalCostInr,
                    modeJustification: newShipment.modeJustification,
                    carbonEmissions: newShipment.carbonEmissions,
                    currentLat: newShipment.currentLat,
                    currentLng: newShipment.currentLng,
                    isRerouted: newShipment.isRerouted,
                    rerouteAlertData: newShipment.rerouteAlertData
                };
                onAutoTrack(mapped);
            }
        } catch (err) {
            toast.error('Failed to register shipment.', { id: submitToast });
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="absolute inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#1C1F2B] border border-[#2A2E3E] rounded-xl shadow-2xl w-[480px] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-[#2A2E3E] bg-[#161822]">
                    <h3 className="font-bold text-gray-200 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-blue-400" />
                        Register New Shipment
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Shipment Name / Cargo</label>
                        <div className="bg-[#13151D] border border-[#2A2E3E] rounded-lg flex items-center px-4 h-11 focus-within:border-blue-500 transition-colors">
                            <Package className="w-4 h-4 mr-3 text-gray-500" />
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                placeholder="e.g. ELECTRONICS-X-204"
                                className="bg-transparent border-none outline-none w-full text-sm text-gray-200"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Origin City</label>
                            <div className="bg-[#13151D] border border-[#2A2E3E] rounded-lg flex items-center px-4 h-11 focus-within:border-blue-500 transition-colors">
                                <MapPin className="w-4 h-4 mr-3 text-gray-500" />
                                <input
                                    type="text"
                                    value={formData.origin}
                                    onChange={(e) => setFormData({...formData, origin: e.target.value})}
                                    placeholder="Mumbai"
                                    className="bg-transparent border-none outline-none w-full text-sm text-gray-200"
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Destination</label>
                            <div className="bg-[#13151D] border border-[#2A2E3E] rounded-lg flex items-center px-4 h-11 focus-within:border-blue-500 transition-colors">
                                <Navigation className="w-4 h-4 mr-3 text-gray-500" />
                                <input
                                    type="text"
                                    value={formData.destination}
                                    onChange={(e) => setFormData({...formData, destination: e.target.value})}
                                    placeholder="London"
                                    className="bg-transparent border-none outline-none w-full text-sm text-gray-200"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Estimated Delivery</label>
                        <div className="bg-[#13151D] border border-[#2A2E3E] rounded-lg flex items-center px-4 h-11 focus-within:border-blue-500 transition-colors">
                            <Calendar className="w-4 h-4 mr-3 text-gray-500" />
                            <input
                                type="date"
                                value={formData.estimatedDelivery}
                                onChange={(e) => setFormData({...formData, estimatedDelivery: e.target.value})}
                                className="bg-transparent border-none outline-none w-full text-sm text-gray-200 [color-scheme:dark]"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-[#242A38] text-gray-300 py-3 rounded-lg hover:bg-[#2C3345] border border-[#3A435A] transition-colors text-sm font-bold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-500 transition-colors text-sm font-bold flex items-center justify-center gap-2"
                        >
                            {loading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Plus className="w-4 h-4"/>}
                            Register Dispatch
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
        id: `SHP${String(i + 1).padStart(3, '0')}`,
        rawId: s.id,
        location: s.currentLat ? `${s.currentLat.toFixed(2)}°, ${s.currentLng?.toFixed(2)}°` : (s.origin || 'Unknown'),
        status: normalizeStatus(s.status) || 'IN TRANSIT',
        eta: s.estimatedDelivery ? new Date(s.estimatedDelivery).toLocaleDateString() : 'N/A',
        risk: s.riskScore ?? 0,
        origin: s.origin || '',
        destination: s.destination || '',
        currentLat: s.currentLat,
        currentLng: s.currentLng,
        activeRoutePolyline: s.activeRoutePolyline,
        standardRoutePolyline: s.standardRoutePolyline,
        alternateRoutesData: s.alternateRoutesData,
        transportMode: s.transportMode,
        totalCostInr: s.totalCostInr,
        modeJustification: s.modeJustification,
        carbonEmissions: s.carbonEmissions,
        isRerouted: s.isRerouted,
        rerouteAlertData: s.rerouteAlertData,
        name: s.name
    }));

    const filteredData = displayData.filter(row => {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery ||
            (row.id || '').toLowerCase().includes(searchLower) ||
            (row.location || '').toLowerCase().includes(searchLower) ||
            (row.origin || '').toLowerCase().includes(searchLower) ||
            (row.name || '').toLowerCase().includes(searchLower) ||
            (row.destination || '').toLowerCase().includes(searchLower);
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
        } catch(err) {
            toast.error('Delete failed. Check backend.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleToggleStatus = async (row) => {
        if (!row.rawId) {
            // No backend ID — toggle locally using fallback display data
            const newStatus = row.status === 'DELIVERED' ? 'IN TRANSIT' : 'DELIVERED';
            toast.success(`Status changed to ${newStatus} (local only — no server ID)`);
            setSelectedShipment(prev => prev ? {...prev, status: newStatus} : null);
            return;
        }
        setActionLoading('status-' + row.rawId);
        // Derive the new display status
        const currentNorm = row.status.toUpperCase().replace(/_/g, ' ');
        const newStatusDisplay = currentNorm === 'DELIVERED' ? 'IN TRANSIT' : 'DELIVERED';
        try {
            // Use the dedicated PATCH /status endpoint — safest, no field overwrite risk
            await axios.patch(`http://localhost:8080/api/shipments/${row.rawId}/status`);
            toast.success(`✅ Status changed to ${newStatusDisplay}`);
            setSelectedShipment(prev => prev ? {...prev, status: newStatusDisplay} : null);
            if (onRefresh) onRefresh();
        } catch(err) {
            const msg = err.response?.data?.message || err.message || 'unknown error';
            toast.error(`Status toggle failed: ${msg}`);
            console.error('Toggle status error:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleGenerateReport = (shipment) => {
        try {
            exportShipmentPDF(shipment);
            toast.success(`📄 PDF report downloaded for ${shipment.id}`);
        } catch(e) {
            toast.error('PDF generation failed.');
            console.error(e);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#13151D] overflow-hidden text-gray-300 relative">

            {/* Track Overlay — rendered via portal to body so it covers the entire screen */}
            {trackShipment && ReactDOM.createPortal(
                <TrackModal shipment={trackShipment} onClose={() => setTrackShipment(null)} />,
                document.body
            )}

            {/* Details Modal */}
            {selectedShipment && (
                <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#1C1F2B] border border-[#2A2E3E] rounded-xl shadow-2xl w-[440px] overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-[#2A2E3E] bg-[#161822]">
                            <h3 className="font-bold text-gray-200">Shipment Details</h3>
                            <button onClick={() => setSelectedShipment(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 text-sm">Tracking ID</span>
                                <span className="font-mono text-gray-200">{selectedShipment.id}</span>
                            </div>
                            {selectedShipment.origin && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 text-sm">Route</span>
                                    <span className="text-gray-300 text-sm">{selectedShipment.origin} → {selectedShipment.destination}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 text-sm">Current Status</span>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(selectedShipment.status)}`}>{selectedShipment.status}</span>
                                    <button
                                        onClick={() => handleToggleStatus(selectedShipment)}
                                        disabled={actionLoading === 'status-' + selectedShipment.rawId}
                                        className="flex items-center gap-1 text-xs bg-[#2A2E3E] hover:bg-[#3A435A] text-gray-300 px-2 py-1 rounded border border-[#3A435A] transition-colors"
                                        title="Toggle status">
                                        {actionLoading === 'status-' + selectedShipment.rawId
                                            ? <RefreshCw className="w-3 h-3 animate-spin"/>
                                            : selectedShipment.status === 'DELIVERED'
                                                ? <ToggleRight className="w-4 h-4 text-green-400"/>
                                                : <ToggleLeft className="w-4 h-4 text-gray-400"/>}
                                        Toggle
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 text-sm">Location</span>
                                <span className="text-gray-300 text-sm">{selectedShipment.location}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 text-sm">ETA</span>
                                <span className="text-gray-300 text-sm">{selectedShipment.eta}</span>
                            </div>
                            {selectedShipment.isRerouted && (
                                <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 px-3 py-2 rounded text-xs text-orange-400">
                                    <Navigation className="w-3 h-3"/> AI Rerouted — Optimal alternate path active
                                </div>
                            )}
                            <div className="bg-[#1A1D27] p-3 rounded border border-[#2A2E3E] mt-1 text-center">
                                <p className="text-xs text-gray-500 mb-1">Risk Assessment Score</p>
                                <p className={`text-2xl font-bold ${selectedShipment.risk > 60 ? 'text-red-500' : selectedShipment.risk > 30 ? 'text-orange-400' : 'text-green-500'}`}>{selectedShipment.risk}%</p>
                                <div className="h-1.5 w-full bg-[#262A38] rounded-full mt-2 overflow-hidden shadow-inner">
                                    <div className={`h-full rounded-full transition-all duration-1000 ${selectedShipment.risk > 60 ? 'bg-red-500' : selectedShipment.risk > 30 ? 'bg-orange-400' : 'bg-green-500'}`} style={{width:`${selectedShipment.risk}%`}}></div>
                                </div>
                            </div>

                            {/* Risk Diagnostics Section */}
                            {(selectedShipment.rerouteAlertData || selectedShipment.risk > 30) && (
                                <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2 text-red-400 font-bold text-[11px] uppercase tracking-wider">
                                        <ShieldAlert className="w-3.5 h-3.5" /> AI Risk Diagnostics
                                    </div>
                                    <div className="space-y-1.5">
                                        {selectedShipment.rerouteAlertData ? (
                                            (() => {
                                                try {
                                                    const alerts = JSON.parse(selectedShipment.rerouteAlertData);
                                                    return alerts.map((msg, i) => (
                                                        <div key={i} className="text-[11px] text-gray-400 leading-relaxed flex gap-2">
                                                            <span className="text-red-500/50">•</span> {msg}
                                                        </div>
                                                    ));
                                                } catch(e) { return <div className="text-[11px] text-gray-500 italic">Telemetry metadata unavailable.</div>; }
                                            })()
                                        ) : (
                                            <div className="text-[11px] text-gray-400 italic">Elevated risk detected. Monitor live telemetry.</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-[#2A2E3E] flex flex-wrap gap-2">
                            <button onClick={() => { setSelectedShipment(null); setTrackShipment(selectedShipment); }}
                                className="flex-1 min-w-[140px] bg-blue-600/20 text-blue-400 py-2.5 rounded-lg hover:bg-blue-600/30 border border-blue-500/30 transition-all text-sm font-bold flex items-center justify-center gap-2 group">
                                <Navigation className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"/> View Route Intelligence
                            </button>
                            <button onClick={() => { handleGenerateReport(selectedShipment); setSelectedShipment(null); }}
                                className="bg-[#2C3B5E] text-blue-300 px-4 py-2.5 rounded-lg hover:bg-[#324570] transition-colors text-sm font-medium flex items-center justify-center gap-2">
                                📄 Report
                            </button>
                            {selectedShipment.status !== 'DELIVERED' && (
                                <button onClick={() => { setSelectedShipment(null); setTrackShipment(selectedShipment); }}
                                    className="flex-1 bg-[#1E3A2E] text-green-400 py-2 rounded hover:bg-[#224433] border border-green-500/20 transition-colors text-sm font-medium flex items-center justify-center gap-1">
                                    <MapPin className="w-3.5 h-3.5"/> Track Live
                                </button>
                            )}
                            <button onClick={() => handleDelete(selectedShipment)}
                                disabled={actionLoading === 'delete-' + selectedShipment.rawId}
                                className="flex items-center justify-center gap-1 px-4 bg-red-500/20 text-red-400 py-2 rounded hover:bg-red-500/30 border border-red-500/30 transition-colors text-sm font-medium">
                                {actionLoading === 'delete-' + selectedShipment.rawId ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <Trash2 className="w-3.5 h-3.5"/>}
                                Delete
                            </button>
                            <button onClick={() => setSelectedShipment(null)} className="px-4 bg-[#242A38] text-gray-300 py-2 rounded hover:bg-[#2C3345] border border-[#3A435A] transition-colors text-sm font-medium">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Shipment Modal */}
            {isAddModalOpen && (
                <AddShipmentModal 
                    onClose={() => setIsAddModalOpen(false)} 
                    onRefresh={onRefresh} 
                    onAutoTrack={(ship) => setTrackShipment(ship)}
                />
            )}

            {/* Top Header */}
            <div className="h-[72px] bg-[#1C1F2B] border-b border-[#2A2E3E] flex items-center justify-between px-8 shadow-sm shrink-0">
                <h2 className="text-[20px] font-bold text-gray-200 tracking-wide">Shipment Management</h2>
                <div className="flex items-center text-gray-400 hover:text-white cursor-pointer transition-colors" onClick={() => toast.success('Options menu accessed.')}>
                    <Menu className="w-6 h-6" />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 flex flex-col gap-6 custom-scrollbar">

                {/* Tabs & New Shipment Button */}
                <div className="flex items-center justify-between h-10 shrink-0">
                    <div className="flex gap-3 h-full">
                        {[
                            { label: 'All Shipments', value: 'ALL', color: 'blue' },
                            { label: 'In Transit', value: 'IN TRANSIT', color: 'green' },
                            { label: 'Delayed', value: 'DELAYED', color: 'red' },
                            { label: 'Delivered', value: 'DELIVERED', color: 'gray' },
                            { label: 'On Hold', value: 'ON HOLD', color: 'yellow' },
                        ].map(tab => (
                            <button key={tab.value} onClick={() => setFilterType(tab.value)}
                                className={`border px-5 rounded shadow-sm text-sm font-semibold flex items-center justify-center relative transition-colors
                                    ${filterType === tab.value ? 'bg-blue-600 text-white border-blue-500' : 'bg-[#1A1D27] text-gray-400 hover:text-gray-200 border-[#2A2E3E]'}`}>
                                {tab.label}
                                {filterType === tab.value && <div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-blue-600"></div>}
                            </button>
                        ))}
                    </div>
                    
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> New Shipment
                    </button>
                </div>

                {/* Main layout */}
                <div className="flex gap-6 flex-1 min-h-[400px]">

                    {/* Table */}
                    <div className="flex-1 flex flex-col gap-4">
                        <div className="bg-[#1A1D27] border border-[#262A38] rounded text-gray-400 flex items-center px-4 h-11 shadow-sm shrink-0 focus-within:border-blue-500 transition-colors">
                            <Search className="w-4 h-4 mr-3" />
                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by ID, city, or origin/destination..."
                                className="bg-transparent border-none outline-none w-full text-sm text-gray-300 placeholder:text-gray-600" />
                        </div>

                        <div className="bg-[#1A1D27] border border-[#262A38] rounded shadow-sm flex-1 overflow-auto flex flex-col">
                            <div className="flex bg-[#1C1F2B] border-b border-[#2A2E3E] p-4 text-xs font-bold text-gray-400 uppercase tracking-wider sticky top-0 z-10">
                                <div className="w-[18%]">Shipment ID</div>
                                <div className="w-[22%]">Location</div>
                                <div className="w-[20%] text-center">Status</div>
                                <div className="w-[15%] text-center">Risk</div>
                                <div className="w-[25%] text-center">Actions</div>
                            </div>
                            <div className="flex flex-col divide-y divide-[#262A38]">
                                {filteredData.length > 0 ? filteredData.map((row, idx) => (
                                    <div key={idx} className="flex items-center p-4 hover:bg-white/5 transition-colors group">
                                        <div className="w-[18%] font-bold text-gray-200 text-sm group-hover:text-blue-400 transition-colors cursor-pointer" onClick={() => setSelectedShipment(row)}>{row.id}</div>
                                        <div className="w-[22%] text-sm text-gray-400 truncate pr-2">{row.location}</div>
                                        <div className="w-[20%] flex justify-center">
                                            <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-center ${getStatusColor(row.status)} shadow-sm`}>
                                                {row.status}
                                            </span>
                                        </div>
                                        <div className="w-[15%] text-center">
                                            <span className={`text-sm font-bold ${row.risk > 60 ? 'text-red-400' : row.risk > 30 ? 'text-orange-400' : 'text-green-400'}`}>{row.risk}%</span>
                                        </div>
                                        <div className="w-[25%] flex justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                            {row.status !== 'DELIVERED' ? (
                                                <button onClick={() => setTrackShipment(row)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded shadow-sm transition-colors flex items-center gap-1">
                                                    <MapPin className="w-3 h-3"/> Track
                                                </button>
                                            ) : (
                                                <button onClick={() => setSelectedShipment(row)} className="bg-gray-600 hover:bg-gray-500 text-white text-xs px-3 py-1.5 rounded shadow-sm transition-colors">View</button>
                                            )}
                                            <button onClick={() => setSelectedShipment(row)} className="bg-[#C54E45] hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded shadow-sm transition-colors">Details</button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-8 text-center text-gray-500 italic">No shipments match your criteria.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right sidebar */}
                    <div className="w-[300px] flex flex-col gap-4 shrink-0 overflow-y-auto pr-1">
                        <div className="bg-[#1A1D27] border border-[#262A38] rounded p-4 shadow-sm flex flex-col gap-3">
                            <h3 className="font-bold text-[15px] text-gray-200">Live Overview Map</h3>
                            <div className="h-40 rounded bg-[#13151D] overflow-hidden relative border border-[#262A38] shadow-inner">
                                <MapContainer center={[20, 78]} zoom={4} style={{ width: '100%', height: '100%' }} zoomControl={false} attributionControl={false}>
                                    <TileLayer url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png" />
                                    {displayData.filter(s => s.currentLat && s.currentLng).map((s, i) => (
                                        <Marker key={i} position={[s.currentLat, s.currentLng]}
                                            icon={new L.DivIcon({ className:'', html:`<div style="width:10px;height:10px;background:${s.risk>60?'#E44B4B':s.risk>30?'#FF9800':'#4CAF50'};border:2px solid white;border-radius:50%"></div>` })}
                                            eventHandlers={{ click: () => setTrackShipment(s) }}>
                                            <Popup>{s.id} — {s.status}</Popup>
                                        </Marker>
                                    ))}
                                </MapContainer>
                            </div>
                            <p className="text-xs text-gray-500">Click a dot to track live position</p>
                        </div>

                        <div className="bg-[#1A1D27] border border-[#262A38] rounded shadow-sm flex flex-col cursor-pointer transition-colors hover:border-[#3A435A]">
                            <div className="flex border-b border-[#262A38]">
                                <div className="flex-1 p-4 flex flex-col items-center justify-center border-r border-[#262A38] hover:bg-white/5" onClick={() => setFilterType('ALL')}>
                                    <div className="text-3xl font-bold text-gray-200">{displayData.length}</div>
                                    <div className="text-xs font-semibold text-gray-400 mt-1">Total Shipments</div>
                                </div>
                                <div className="flex-1 p-4 flex flex-col items-center justify-center hover:bg-white/5" onClick={() => setFilterType('DELAYED')}>
                                    <div className="text-3xl font-bold text-red-400">{displayData.filter(d=>d.status==='DELAYED').length}</div>
                                    <div className="text-xs font-semibold text-[#F44336] mt-1">Delayed</div>
                                </div>
                            </div>
                            <div className="p-4 flex flex-col items-center justify-center hover:bg-white/5" onClick={() => setFilterType('DELIVERED')}>
                                <div className="text-3xl font-bold text-green-400">{displayData.filter(d=>d.status==='DELIVERED').length}</div>
                                <div className="text-xs font-semibold text-[#4CAF50] mt-1">Delivered</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Summary Strip */}
                <div className="flex flex-col gap-3 shrink-0 mb-2">
                    <div className="bg-[#1A1D27] border text-gray-300 border-[#262A38] rounded-lg shadow-sm h-14 flex items-center px-6 divide-x divide-[#262A38]">
                        <div className="flex-1 flex items-center justify-center gap-3 cursor-pointer hover:bg-white/5 h-full rounded-l" onClick={() => setFilterType('ALL')}>
                            <Briefcase className="w-5 h-5 text-gray-400" />
                            <span className="text-[13px] text-gray-400 font-medium">Total: <strong className="text-gray-200 text-[15px] ml-1">{displayData.length}</strong></span>
                        </div>
                        <div className="flex-1 flex items-center justify-center gap-3 cursor-pointer hover:bg-white/5 h-full" onClick={() => setFilterType('IN TRANSIT')}>
                            <Package className="w-5 h-5 text-blue-400" />
                            <span className="text-[13px] text-gray-400 font-medium">In Transit: <strong className="text-gray-200 text-[15px] ml-1">{displayData.filter(d=>normalizeStatus(d.status)==='IN TRANSIT').length}</strong></span>
                        </div>
                        <div className="flex-1 flex items-center justify-center gap-3 cursor-pointer hover:bg-white/5 h-full" onClick={() => setFilterType('DELAYED')}>
                            <XSquare className="w-5 h-5 text-[#F44336]" />
                            <span className="text-[13px] text-gray-400 font-medium">Delayed: <strong className="text-[#F44336] text-[15px] ml-1">{displayData.filter(d=>d.status==='DELAYED').length}</strong></span>
                        </div>
                        <div className="flex-1 flex items-center justify-center gap-3 cursor-pointer hover:bg-white/5 h-full rounded-r" onClick={() => setFilterType('DELIVERED')}>
                            <CheckSquare className="w-5 h-5 text-[#4CAF50]" />
                            <span className="text-[13px] text-gray-400 font-medium">Delivered: <strong className="text-[#4CAF50] text-[15px] ml-1">{displayData.filter(d=>d.status==='DELIVERED').length}</strong></span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ShipmentManagement;
