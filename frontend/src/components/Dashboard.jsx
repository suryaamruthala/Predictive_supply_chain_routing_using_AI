import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import MapView from './MapComponent';
import Sidebar from './Sidebar';
import KPIBoard from './KPIBoard';
import LanguageSelector from './LanguageSelector';

const Dashboard = () => {
  const { t } = useTranslation();
  const [shipments, setShipments] = useState([]);
  const [kpiData, setKpiData] = useState({ active: 0, delayed: 0, critical: 0 });

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        const response = await axios.get('http://localhost:8080/api/shipments');
        const data = response.data;
        if (data && data.length > 0) {
            setShipments(data);
            
            const active = data.filter(s => s.status === 'IN_TRANSIT').length;
            const delayed = data.filter(s => s.status === 'DELAYED').length;
            const critical = data.filter(s => s.riskScore > 70).length;
            setKpiData({ active, delayed, critical });
        } else {
            // Fallback mock data if DB empty
            setShipments([
              { id: 1, name: 'S-001 Electronics', lat: 37.7749, lng: -122.4194, status: 'IN_TRANSIT', riskScore: 10 },
              { id: 2, name: 'S-002 Pharmaceuticals', lat: 34.0522, lng: -118.2437, status: 'DELAYED', riskScore: 85 }
            ]);
            setKpiData({ active: 1, delayed: 1, critical: 1 });
        }
      } catch (error) {
        console.error("Error fetching shipments:", error);
        // Fallback mock data
        setShipments([
          { id: 1, name: 'S-001 Electronics', lat: 37.7749, lng: -122.4194, status: 'IN_TRANSIT', riskScore: 10 },
          { id: 2, name: 'S-002 Pharmaceuticals', lat: 34.0522, lng: -118.2437, status: 'DELAYED', riskScore: 85 }
        ]);
        setKpiData({ active: 1, delayed: 1, critical: 1 });
      }
    };
    
    fetchShipments();
    const interval = setInterval(fetchShipments, 5000); // Poll every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden text-textMain">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full relative">
        <div className="flex items-center justify-between px-8 py-4 glass-panel m-4 rounded-xl z-10">
          <h2 className="text-xl font-bold">{t('Predictive Supply Chain Platform')}</h2>
          <div className="flex gap-4 items-center">
            <LanguageSelector />
            <div className="font-semibold bg-primary/20 px-4 py-2 rounded-lg text-primary">Admin</div>
          </div>
        </div>
        
        <div className="flex-1 relative m-4 mt-0 rounded-2xl overflow-hidden">
          <MapView shipments={shipments} />
          
          <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-4 pointer-events-none [&>*]:pointer-events-auto">
            <KPIBoard data={kpiData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
