import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Search } from 'lucide-react';

/* ------------------ MAP FLY ------------------ */
const MapMover = ({ location }) => {
  const map = useMap();

  React.useEffect(() => {
    if (location) {
      map.flyTo([location.lat, location.lng], 12, { duration: 2 });
    }
  }, [location, map]);

  return null;
};

/* ------------------ RISK COLOR ------------------ */
const getRiskColor = (risk) => {
  if (risk > 70) return "from-red-500 to-red-700";
  if (risk > 40) return "from-yellow-400 to-yellow-600";
  return "from-green-400 to-green-600";
};

/* ------------------ MAIN ------------------ */
const UserRiskPortal = ({ heatmapZones }) => {

  const [query, setQuery] = useState('');
  const [location, setLocation] = useState(null);

  const [currentRisk, setCurrentRisk] = useState(null);
  const [futureRisk, setFutureRisk] = useState(null);
  const [riskDetails, setRiskDetails] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  /* ------------------ SEARCH ------------------ */
  const handleSearch = async () => {

    if (!query) return;

    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}`
      );
      const geoData = await geoRes.json();

      if (!geoData.length) return alert("Location not found");

      const lat = parseFloat(geoData[0].lat);
      const lng = parseFloat(geoData[0].lon);

      const loc = { name: query, lat, lng };
      setLocation(loc);

      const res = await fetch("http://localhost:8000/predict-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loc)
      });

      const data = await res.json();

      setCurrentRisk(data.current_risk);
      setFutureRisk(data.future_risk);
      setRiskDetails(data.factors);

      const recs = [];
      if (data.future_risk > 70) recs.push("🚫 Avoid travel");
      if (data.factors.weather > 60) recs.push("🌧 Weather unstable");
      if (data.factors.traffic > 60) recs.push("🚗 Traffic heavy");
      if (!recs.length) recs.push("✅ Safe route");

      setRecommendations(recs);

    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="h-full bg-black text-white relative overflow-hidden">

      {/* 🔍 SEARCH */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[1000] w-[360px]">
        <div className="flex bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 shadow-lg">

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city / village..."
            className="bg-transparent outline-none flex-1 text-white"
          />

          <button onClick={handleSearch}>
            <Search className="text-gray-400" />
          </button>

        </div>
      </div>

      {/* 📊 RISK PANEL */}
      {location && (
        <div className="absolute top-1/2 right-10 -translate-y-1/2 z-[1000] w-[340px] bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl">

          <h3 className="text-lg font-bold mb-6">📍 {location.name}</h3>

          {/* 🔥 CIRCULAR RISK */}
          <div className="flex justify-center mb-6">

            <div className={`w-32 h-32 rounded-full flex items-center justify-center bg-gradient-to-br ${getRiskColor(currentRisk)} shadow-[0_0_40px_rgba(255,0,0,0.3)] animate-pulse`}>

              <span className="text-3xl font-bold">
                {currentRisk}%
              </span>

            </div>

          </div>

          {/* FUTURE */}
          <div className="flex justify-between mb-4 text-sm">
            <span>Future Risk</span>
            <span className="text-yellow-400">{futureRisk}%</span>
          </div>

          {/* FACTORS */}
          {riskDetails && (
            <div className="space-y-2 text-xs mb-4 text-gray-300">
              <p>🌦 Weather: {riskDetails.weather}%</p>
              <p>🚗 Traffic: {riskDetails.traffic}%</p>
              <p>🌍 Geo: {riskDetails.geopolitics}%</p>
            </div>
          )}

          {/* RECOMMENDATIONS */}
          <div>
            <p className="text-blue-400 text-xs mb-2">AI Recommendations</p>
            {recommendations.map((r, i) => (
              <p key={i} className="text-xs">{r}</p>
            ))}
          </div>

        </div>
      )}

      {/* 🗺️ MAP */}
      <div className="h-full m-4 rounded-3xl overflow-hidden border border-white/10">

        <MapContainer center={[20, 78]} zoom={4} style={{ height: "100%" }}>

          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

          <MapMover location={location} />

          {/* 🔥 HEATMAP WITH ANIMATION */}
          {heatmapZones.map(z => (
            <Circle
              key={z.id}
              center={[z.lat, z.lng]}
              radius={z.radius_km * 1000}
              pathOptions={{
                fillColor: z.intensity > 70 ? "#ef4444" : "#3b82f6",
                fillOpacity: 0.3,
                color: "transparent"
              }}
              className="animate-pulse"
            />
          ))}

          {/* TARGET */}
          {location && (
            <Marker
              position={[location.lat, location.lng]}
              icon={new L.DivIcon({
                html: `<div class="w-5 h-5 bg-blue-500 rounded-full shadow-[0_0_20px_#3b82f6]"></div>`
              })}
            />
          )}

        </MapContainer>

      </div>

    </div>
  );
};

export default UserRiskPortal;