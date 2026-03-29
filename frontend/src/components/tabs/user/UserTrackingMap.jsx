import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Truck, Crosshair, MapPin, Navigation, Package, Clock,
  Fuel, AlertTriangle, Route, Compass, Globe, Zap,
  ChevronRight, Shield, Thermometer, ArrowUpRight, Map as MapIcon
} from 'lucide-react';

/* ── Auto fit bounds ── */
function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 8, duration: 1.5 });
    }
  }, [bounds, map]);
  return null;
}

/* ── Fly to center ── */
function FlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom || 6, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

/* ── Marker factories ── */
const makeGlowMarker = (color, size = 14, pulse = false) => new L.DivIcon({
  className: '',
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2],
  html: `<div style="
    width:${size}px;height:${size}px;background:${color};border-radius:50%;
    border:2.5px solid white;
    box-shadow:0 0 12px ${color},0 0 24px ${color}40;
    ${pulse ? 'animation:markerPulse 2s ease-in-out infinite;' : ''}
  "></div>`
});

const makeTextMarker = (label, bgColor) => new L.DivIcon({
  className: '',
  iconSize: [0, 0],
  iconAnchor: [0, 20],
  html: `<div style="
    position:relative;left:-50%;
    background:${bgColor};color:white;
    padding:4px 10px;border-radius:8px;
    font-size:10px;font-weight:700;font-family:Inter,sans-serif;
    white-space:nowrap;letter-spacing:0.5px;
    box-shadow:0 4px 15px ${bgColor}60;
    border:1px solid rgba(255,255,255,0.2);
  ">${label}</div>`
});

/* ── Helpers ── */
const statusConfig = {
  IN_TRANSIT: { bg: 'from-blue-500/20 to-blue-600/10', text: 'text-blue-400', dot: 'bg-blue-500', border: 'border-blue-500/30', badge: 'bg-blue-500/20 text-blue-400', color: '#3b82f6' },
  DELAYED:    { bg: 'from-red-500/20 to-red-600/10', text: 'text-red-400', dot: 'bg-red-500', border: 'border-red-500/30', badge: 'bg-red-500/20 text-red-400', color: '#ef4444' },
  DELIVERED:  { bg: 'from-green-500/20 to-green-600/10', text: 'text-green-400', dot: 'bg-green-500', border: 'border-green-500/30', badge: 'bg-green-500/20 text-green-400', color: '#22c55e' },
  BLOCKED:    { bg: 'from-yellow-500/20 to-yellow-600/10', text: 'text-yellow-400', dot: 'bg-yellow-500', border: 'border-yellow-500/30', badge: 'bg-yellow-500/20 text-yellow-400', color: '#eab308' },
  REROUTED:   { bg: 'from-purple-500/20 to-purple-600/10', text: 'text-purple-400', dot: 'bg-purple-500', border: 'border-purple-500/30', badge: 'bg-purple-500/20 text-purple-400', color: '#a855f7' },
};
const getS = (status) => statusConfig[status] || statusConfig.IN_TRANSIT;
const modeIcons = { AIR: '✈️', ROAD: '🚛', WATER: '🚢', SEA: '🚢' };

const parseWaypoints = (json) => { try { return JSON.parse(json) || []; } catch { return []; } };

const getProgress = (ship) => {
  if (!ship) return 0;
  if (ship.status === 'DELIVERED') return 100;
  if (!ship.activeRoutePolyline) return 5;
  const wps = parseWaypoints(ship.activeRoutePolyline);
  if (wps.length <= 1) return 5;
  const idx = ship.currentRouteIndex || 0;
  return Math.min(95, Math.max(5, Math.round((idx / (wps.length - 1)) * 100)));
};

const glassStyle = {
  background: 'rgba(15,23,42,0.7)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN COMPONENT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const UserTrackingMap = ({
  shipments,
  selectedShip,
  selectedShipId,
  setSelectedShipId,
  isFollowing,
  setIsFollowing,
  simulatedPoints = []
}) => {
  const [flyTarget, setFlyTarget] = useState(null);
  const [time, setTime] = useState(new Date());

  // Auto-select first shipment if none selected
  useEffect(() => {
    if (!selectedShipId && shipments.length > 0) {
      const first = shipments.find(s => s.currentLat != null);
      if (first) {
        setSelectedShipId(first.id);
        setIsFollowing(true);
      }
    }
  }, [shipments, selectedShipId, setSelectedShipId, setIsFollowing]);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const ss = useMemo(() => getS(selectedShip?.status), [selectedShip?.status]);
  const progress = useMemo(() => getProgress(selectedShip), [selectedShip]);

  const selectedWaypoints = useMemo(
    () => selectedShip?.activeRoutePolyline ? parseWaypoints(selectedShip.activeRoutePolyline) : [],
    [selectedShip?.activeRoutePolyline]
  );

  // Compute bounds to show full route of selected shipment
  const fitBounds = useMemo(() => {
    if (!selectedShip) return null;
    const wps = selectedWaypoints;
    if (wps.length >= 2) {
      return wps.map(p => [p.lat, p.lng]);
    }
    if (selectedShip.currentLat != null) {
      return [[selectedShip.currentLat - 5, selectedShip.currentLng - 5], [selectedShip.currentLat + 5, selectedShip.currentLng + 5]];
    }
    return null;
  }, [selectedShip, selectedWaypoints]);

  // When selected ship changes, fit map to its route
  const [activeBounds, setActiveBounds] = useState(null);
  const prevShipRef = React.useRef(null);

  useEffect(() => {
    if (selectedShipId && selectedShipId !== prevShipRef.current && fitBounds) {
      prevShipRef.current = selectedShipId;
      setActiveBounds(fitBounds);
    }
  }, [selectedShipId, fitBounds]);

  const selectShipment = (s) => {
    if (s.currentLat == null) return;
    setSelectedShipId(s.id);
    setIsFollowing(true);
    setFlyTarget(null);
    prevShipRef.current = null; // force re-fit
  };

  return (
    <div className="h-full flex gap-4 overflow-hidden">

      {/* ━━ LEFT: MAP ━━ */}
      <div className="flex-1 relative rounded-3xl overflow-hidden border border-white/10" style={glassStyle}>

        <MapContainer center={[20, 78]} zoom={5} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />

          {activeBounds && <FitBounds bounds={activeBounds} />}
          {flyTarget && <FlyTo center={flyTarget} zoom={7} />}

          {/* ── All shipments: origin, current, destination markers + routes ── */}
          {shipments.map(s => {
            const wps = s.activeRoutePolyline ? parseWaypoints(s.activeRoutePolyline) : [];
            const sConf = getS(s.status);
            const isSel = s.id === selectedShipId;
            const origin = wps.length > 0 ? wps[0] : null;
            const dest = wps.length > 1 ? wps[wps.length - 1] : null;

            return (
              <React.Fragment key={s.id}>
                {/* Route polyline */}
                {wps.length >= 2 && (
                  <>
                    {isSel && <Polyline positions={wps.map(p => [p.lat, p.lng])} pathOptions={{ color: sConf.color, weight: 3, opacity: 0.25, dashArray: '10, 8' }} />}
                    <Polyline
                      positions={wps.map(p => [p.lat, p.lng])}
                      pathOptions={{
                        color: isSel ? sConf.color : '#475569',
                        weight: isSel ? 4 : 2,
                        opacity: isSel ? 0.9 : 0.3,
                        ...(isSel ? {} : { dashArray: '4, 8' })
                      }}
                    />
                  </>
                )}

                {/* Origin marker */}
                {origin && (
                  <Marker position={[origin.lat, origin.lng]} icon={makeTextMarker(`📍 ${s.origin || 'Origin'}`, '#22c55e')}>
                    {isSel && <Tooltip permanent direction="bottom" offset={[0, 10]} opacity={1} className="!bg-transparent !border-none !shadow-none !p-0">
                      <span className="text-[9px] font-bold text-green-400 bg-green-500/20 px-2 py-0.5 rounded-md border border-green-500/30">ORIGIN</span>
                    </Tooltip>}
                  </Marker>
                )}

                {/* Destination marker */}
                {dest && (
                  <Marker position={[dest.lat, dest.lng]} icon={makeTextMarker(`🏁 ${s.destination || 'Dest'}`, '#ef4444')}>
                    {isSel && <Tooltip permanent direction="bottom" offset={[0, 10]} opacity={1} className="!bg-transparent !border-none !shadow-none !p-0">
                      <span className="text-[9px] font-bold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-md border border-red-500/30">DESTINATION</span>
                    </Tooltip>}
                  </Marker>
                )}

                {/* Current position marker (glowing) */}
                {s.currentLat != null && (
                  <Marker
                    position={[s.currentLat, s.currentLng]}
                    icon={makeGlowMarker(sConf.color, isSel ? 20 : 14, isSel)}
                    eventHandlers={{ click: () => selectShipment(s) }}
                  >
                    <Tooltip permanent={isSel} direction="top" offset={[0, -14]} opacity={1}
                      className="!bg-transparent !border-none !shadow-none !p-0">
                      <div className="text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
                        <div className="bg-slate-900/95 backdrop-blur-md text-white px-3 py-2 rounded-xl border border-white/10 shadow-2xl">
                          <p className="text-xs font-bold">{s.name}</p>
                          <p className="text-[10px] text-slate-400">{s.origin} → {s.destination}</p>
                        </div>
                      </div>
                    </Tooltip>
                  </Marker>
                )}
              </React.Fragment>
            );
          })}

          {/* Simulated points */}
          {simulatedPoints.map(pt => (
            <Marker key={pt.id} position={[pt.lat, pt.lng]}
              icon={new L.DivIcon({ className: '', html: `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;background:linear-gradient(135deg,#A78BFA,#7C3AED);border:2px solid white;border-radius:50%;box-shadow:0 0 10px rgba(167,139,250,0.8);font-size:10px;">📍</div>` })}
            />
          ))}
        </MapContainer>

        {/* Overlay: Satellite badge */}
        <div className="absolute top-5 left-5 z-[1000]">
          <div className="rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl border border-white/10" style={glassStyle}>
            <Globe className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Live Tracking</p>
              <p className="text-xs text-white font-mono">{time.toLocaleTimeString()}</p>
            </div>
          </div>
        </div>

        {/* Overlay: Fleet count */}
        <div className="absolute top-5 right-5 z-[1000]">
          <div className="px-4 py-2.5 rounded-2xl text-xs font-bold text-white flex items-center gap-2 border border-white/10" style={glassStyle}>
            <Truck className="w-4 h-4 text-blue-400" />
            {shipments.filter(s => s.status !== 'DELIVERED').length} Active
          </div>
        </div>

        {/* Overlay: Track / Follow toggle */}
        {selectedShip && (
          <div className="absolute bottom-5 right-5 z-[1000]">
            <button
              onClick={() => {
                setIsFollowing(!isFollowing);
                if (!isFollowing && selectedShip.currentLat) {
                  setFlyTarget([selectedShip.currentLat, selectedShip.currentLng]);
                }
              }}
              className={`px-5 py-3 rounded-2xl flex items-center gap-2 text-xs font-bold uppercase tracking-widest transition-all shadow-2xl border ${
                isFollowing ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_30px_rgba(59,130,246,0.5)]' : 'border-white/10 text-slate-300 hover:text-white'
              }`}
              style={isFollowing ? {} : glassStyle}
            >
              <Crosshair className={`w-4 h-4 ${isFollowing ? 'animate-pulse' : ''}`} />
              {isFollowing ? 'Tracking Live' : 'Enable Tracking'}
            </button>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-5 left-5 z-[1000]">
          <div className="rounded-2xl px-4 py-3 flex items-center gap-4 text-[10px] text-slate-300 font-semibold border border-white/10" style={glassStyle}>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Origin</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block animate-pulse" /> Current</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Destination</span>
          </div>
        </div>
      </div>

      {/* ━━ RIGHT: DETAIL PANEL ━━ */}
      <div className="w-[400px] flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">

        {/* Fleet List */}
        <div className="rounded-3xl p-5 border border-white/10" style={glassStyle}>
          <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-blue-400" /> Fleet Registry
          </h3>
          <div className="flex flex-col gap-2 max-h-44 overflow-y-auto custom-scrollbar pr-1">
            {shipments.length === 0 && <p className="text-xs text-slate-500 italic">No active shipments found.</p>}
            {shipments.map(s => {
              const sty = getS(s.status);
              const isActive = s.id === selectedShipId;
              return (
                <button key={s.id} onClick={() => selectShipment(s)}
                  className={`w-full text-left p-3.5 rounded-2xl transition-all border flex items-center gap-3 group ${
                    isActive ? `bg-gradient-to-r ${sty.bg} ${sty.border} shadow-lg` : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                  }`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${sty.dot} shrink-0 ${isActive ? 'animate-pulse shadow-lg' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{s.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{s.origin} → {s.destination}</p>
                  </div>
                  <span className={`text-[8px] px-2 py-1 rounded-lg font-black uppercase ${sty.badge}`}>{s.status}</span>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-600 group-hover:text-white'} transition-colors`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Selected Shipment Details ── */}
        {selectedShip ? (
          <>
            {/* Status + Progress */}
            <div className={`rounded-3xl p-5 border ${ss.border}`} style={glassStyle}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${ss.bg} flex items-center justify-center border ${ss.border}`}>
                    <Truck className={`w-6 h-6 ${ss.text}`} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{selectedShip.name}</h3>
                    <p className="text-[11px] text-slate-400">{selectedShip.origin} → {selectedShip.destination}</p>
                  </div>
                </div>
                <div className={`text-[9px] px-2.5 py-1.5 rounded-xl font-black uppercase ${ss.badge} flex items-center gap-1.5`}>
                  <span className={`w-2 h-2 rounded-full ${ss.dot} animate-pulse`} />
                  {selectedShip.status}
                </div>
              </div>

              {/* Progress */}
              <div className="mb-1">
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold mb-1.5">
                  <span>Delivery Progress</span>
                  <span className={`${ss.text} font-bold`}>{progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ${
                    selectedShip.status === 'DELIVERED' ? 'bg-green-500' : selectedShip.status === 'DELAYED' ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
                  }`} style={{ width: `${progress}%`, boxShadow: `0 0 12px ${ss.color}` }} />
                </div>
              </div>
              {selectedShip.estimatedDelivery && (
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-3">
                  <Clock className="w-3.5 h-3.5" /> ETA: <span className="text-white font-semibold">{new Date(selectedShip.estimatedDelivery).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Live Location */}
            <div className="rounded-3xl p-5 border border-white/10" style={glassStyle}>
              <h4 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                <Navigation className="w-4 h-4 text-green-400" /> Live Location
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <GlassMetric icon={<Compass className="w-4 h-4 text-blue-400" />} label="Latitude" value={selectedShip.currentLat?.toFixed(5) || 'N/A'} />
                <GlassMetric icon={<Compass className="w-4 h-4 text-purple-400" />} label="Longitude" value={selectedShip.currentLng?.toFixed(5) || 'N/A'} />
                <GlassMetric icon={<MapIcon className="w-4 h-4 text-cyan-400" />} label="Transport"
                  value={`${modeIcons[selectedShip.transportMode?.replace(/\s*\(.*\)/, '')] || '📦'} ${selectedShip.transportMode || 'N/A'}`} />
                <GlassMetric icon={<Shield className="w-4 h-4 text-orange-400" />} label="Risk Score" value={`${selectedShip.riskScore ?? 0}%`}
                  highlight={selectedShip.riskScore > 60 ? 'text-red-400' : selectedShip.riskScore > 30 ? 'text-yellow-400' : 'text-green-400'} />
              </div>

              {/* Mini origin/dest summary */}
              <div className="mt-4 flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-green-400 bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20">
                  <MapPin className="w-3 h-3" /> {selectedShip.origin}
                </span>
                <span className="text-slate-600">→→→</span>
                <span className="flex items-center gap-1.5 text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">
                  <MapPin className="w-3 h-3" /> {selectedShip.destination}
                </span>
              </div>
            </div>

            {/* Telemetry */}
            <div className="rounded-3xl p-5 border border-white/10" style={glassStyle}>
              <h4 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-yellow-400" /> Telemetry
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <GlassMetric icon={<Fuel className="w-4 h-4 text-emerald-400" />} label="CO₂ Emissions" value={`${selectedShip.carbonEmissions?.toFixed(1) || '0.0'} kg`} />
                <GlassMetric icon={<Thermometer className="w-4 h-4 text-pink-400" />} label="Cost (INR)" value={selectedShip.totalCostInr ? `₹${Math.round(selectedShip.totalCostInr).toLocaleString()}` : 'N/A'} />
                <GlassMetric icon={<AlertTriangle className="w-4 h-4 text-yellow-400" />} label="Rerouted" value={selectedShip.isRerouted ? '⚠ Yes' : '✓ No'}
                  highlight={selectedShip.isRerouted ? 'text-yellow-400' : 'text-green-400'} />
                <GlassMetric icon={<Route className="w-4 h-4 text-blue-400" />} label="Waypoints" value={selectedWaypoints.length} />
              </div>
              {selectedShip.modeJustification && (
                <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-200 leading-relaxed">
                  <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mb-1">🤖 AI Justification</p>
                  {selectedShip.modeJustification}
                </div>
              )}
            </div>

            {/* Route Waypoints */}
            {selectedWaypoints.length > 0 && (
              <div className="rounded-3xl p-5 border border-white/10" style={glassStyle}>
                <h4 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Route className="w-4 h-4 text-cyan-400" /> Route Path ({selectedWaypoints.length} points)
                </h4>
                <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                  {selectedWaypoints.map((wp, i) => {
                    const idx = selectedShip.currentRouteIndex || 0;
                    const isCurrent = i === idx;
                    const isPast = i < idx;
                    const isFirst = i === 0;
                    const isLast = i === selectedWaypoints.length - 1;
                    return (
                      <button key={i} onClick={() => setFlyTarget([wp.lat, wp.lng])}
                        className={`flex items-center gap-3 p-2.5 rounded-xl transition-all text-xs text-left w-full ${
                          isCurrent ? 'bg-blue-500/15 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                          : isPast ? 'opacity-40' : 'hover:bg-white/5 border border-transparent'
                        }`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isFirst ? 'bg-green-500 text-white' :
                          isLast ? 'bg-red-500 text-white' :
                          isCurrent ? 'bg-blue-500 text-white shadow-[0_0_12px_#3b82f6]' :
                          isPast ? 'bg-slate-700 text-slate-400' : 'bg-white/10 text-slate-300'
                        }`}>
                          {isFirst ? '🚀' : isLast ? '🏁' : i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold truncate ${isCurrent ? 'text-blue-300' : isFirst ? 'text-green-300' : isLast ? 'text-red-300' : 'text-slate-300'}`}>
                            {wp.name || (isFirst ? selectedShip.origin : isLast ? selectedShip.destination : `Waypoint ${i + 1}`)}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">{wp.lat?.toFixed(4)}, {wp.lng?.toFixed(4)}</p>
                        </div>
                        {isCurrent && <span className="text-[8px] px-2 py-0.5 rounded bg-blue-500/30 text-blue-400 font-bold uppercase shrink-0">LIVE</span>}
                        {isFirst && <ArrowUpRight className="w-3.5 h-3.5 text-green-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reroute Alerts */}
            {selectedShip.rerouteAlertData && (() => {
              try {
                const alerts = JSON.parse(selectedShip.rerouteAlertData);
                if (!alerts?.length) return null;
                return (
                  <div className="rounded-3xl p-5 border border-yellow-500/20" style={glassStyle}>
                    <h4 className="text-xs font-bold text-yellow-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4" /> Reroute Alerts ({alerts.length})
                    </h4>
                    <div className="flex flex-col gap-2 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                      {alerts.map((a, i) => (
                        <p key={i} className="text-[11px] text-yellow-200/80 bg-yellow-500/10 px-3 py-2 rounded-xl border border-yellow-500/10">{a}</p>
                      ))}
                    </div>
                  </div>
                );
              } catch { return null; }
            })()}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center rounded-3xl border border-white/10 p-8" style={glassStyle}>
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center mb-6">
              <Package className="w-10 h-10 text-blue-400/50" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Select a Shipment</h3>
            <p className="text-sm text-slate-500 text-center max-w-[250px] leading-relaxed">
              Choose a shipment from the fleet registry to view live tracking, route, and telemetry data.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes markerPulse { 0%,100%{transform:scale(1);opacity:1;} 50%{transform:scale(1.4);opacity:0.7;} }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.3); border-radius: 10px; }
      `}</style>
    </div>
  );
};

/* ── Glass Metric Card ── */
const GlassMetric = ({ icon, label, value, highlight }) => (
  <div className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group cursor-default">
    <div className="flex items-center gap-2 mb-1.5">
      {icon}
      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{label}</span>
    </div>
    <p className={`text-sm font-bold ${highlight || 'text-white'} group-hover:scale-[1.02] transition-transform origin-left`}>{value}</p>
  </div>
);

export default UserTrackingMap;
