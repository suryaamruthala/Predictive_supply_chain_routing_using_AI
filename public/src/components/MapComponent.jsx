import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';

// Fix Leaflet's default icon rendering issue in React
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconRetinaUrl: iconRetina,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapComponent = ({ shipments }) => {
  const center = [37.7749, -122.4194]; // Default to US West Coast

  return (
    <MapContainer center={center} zoom={4} style={{ height: '100%', width: '100%', borderRadius: '16px' }} className="glass-panel">
      {/* Dark theme styled map tiles from CartoDB */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      
      {shipments.map((shipment) => (
        <Marker key={shipment.id} position={[shipment.lat, shipment.lng]}>
          <Popup>
            <div style={{ color: 'var(--bg-color)' }}>
              <strong>{shipment.name}</strong><br />
              Status: {shipment.status}<br />
              Risk Score: <span style={{ color: shipment.riskScore > 70 ? 'red' : 'green' }}>{shipment.riskScore}</span>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapComponent;
