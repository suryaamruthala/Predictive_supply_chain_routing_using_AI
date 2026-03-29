import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MapView from './MapComponent';
import Sidebar from './Sidebar';
import KPIBoard from './KPIBoard';
import LanguageSelector from './LanguageSelector';
import AlertPanel from '../components/AlertPanel';

const Dashboard = () => {

  const [shipments, setShipments] = useState([]);
  const [kpiData, setKpiData] = useState({ active: 0, delayed: 0, critical: 0 });
  const [activeTab, setActiveTab] = useState("Dashboard");

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        const res = await axios.get('http://localhost:8080/api/shipments');
        const data = res.data;

        if (data?.length) {
          setShipments(data);

          setKpiData({
            active: data.filter(s => s.status === 'IN_TRANSIT').length,
            delayed: data.filter(s => s.status === 'DELAYED').length,
            critical: data.filter(s => s.riskScore > 70).length
          });
        }
      } catch {
        const mock = [
          { id: 1, name: 'Electronics', lat: 37.77, lng: -122.41, status: 'IN_TRANSIT', riskScore: 10 },
          { id: 2, name: 'Pharma', lat: 34.05, lng: -118.24, status: 'DELAYED', riskScore: 85 }
        ];
        setShipments(mock);
        setKpiData({ active: 1, delayed: 1, critical: 1 });
      }
    };

    fetchShipments();
    const interval = setInterval(fetchShipments, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white relative">

      {/* 🔔 FLOATING ALERT BELL */}
      <AlertPanel />

      <Sidebar setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col">

        {/* TOP BAR */}
        <div className="flex justify-between items-center m-4 px-6 py-3 rounded-2xl glass-panel">

          <h1 className="text-xl font-semibold tracking-wide">
            🚀 Supply Chain Intelligence
          </h1>

          <div className="flex items-center gap-4">
            <LanguageSelector />
            <div className="px-4 py-2 rounded-xl glass-panel text-blue-400 font-semibold">
              Admin
            </div>
          </div>
        </div>

        <div className="flex-1">

          {activeTab === "Dashboard" && (
            <div className="grid grid-cols-4 gap-4 px-4 pb-4 h-full">

              <div className="col-span-3 relative glass-panel overflow-hidden">
                <MapView shipments={shipments} />

                <div className="absolute top-4 right-4 z-50 w-72">
                  <KPIBoard data={kpiData} />
                </div>
              </div>

              <div className="flex flex-col gap-4">

                <div className="glass-panel">
                  <h3 className="font-semibold mb-3">🚨 AI Alerts</h3>
                  <p className="text-sm text-gray-400">
                    Use 🔔 icon (top right) to view alerts
                  </p>
                </div>

                <div className="glass-panel">
                  <h3 className="font-semibold mb-3">📊 Insights</h3>
                  <p className="text-sm text-gray-400">
                    AI predicts 18% delay reduction.
                  </p>
                </div>

              </div>

            </div>
          )}

          {activeTab === "AI Alerts" && (
            <div className="p-4">
              <h2 className="text-lg font-bold">🔔 Alerts Panel</h2>
              <p className="text-sm text-gray-400 mt-2">
                Use the bell icon (top right) to open alerts
              </p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default Dashboard;