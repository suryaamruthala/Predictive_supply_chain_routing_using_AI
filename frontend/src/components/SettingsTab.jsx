import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings2, CheckCircle2, XCircle, Trash2, RefreshCw, Server, Cpu, Wifi } from 'lucide-react';

const StatusBadge = ({ ok, label }) => (
    <div className={`flex items-center gap-2 px-3 py-2 rounded border text-sm font-medium ${ok ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
        {ok ? <CheckCircle2 className="w-4 h-4"/> : <XCircle className="w-4 h-4"/>}
        {label}: {ok ? 'Online' : 'Offline'}
    </div>
);

const SettingsTab = ({ toast, heatmapZones, isAiPaused }) => {
    const [backendOk, setBackendOk] = useState(null);
    const [aiOk, setAiOk] = useState(null);
    const [injectedStormsCount, setInjectedStormsCount] = useState(0);
    const [checking, setChecking] = useState(false);

    const checkStatus = async () => {
        setChecking(true);
        try {
            await axios.get('http://localhost:8080/api/shipments');
            setBackendOk(true);
        } catch { setBackendOk(false); }
        try {
            await axios.get('http://localhost:8000/api/heatmap');
            setAiOk(true);
        } catch { setAiOk(false); }
        setChecking(false);
        toast.success('System health check complete.');
    };

    const clearStorms = async () => {
        try {
            await axios.post('http://localhost:8000/api/clear/storms');
            setInjectedStormsCount(0);
            toast.success('All injected storm anomalies cleared.');
        } catch (err) {
            toast.error('Failed to clear storms. Check AI service.');
        }
    };

    useEffect(() => { checkStatus(); }, []);
    useEffect(() => {
        const simulated = heatmapZones.filter(z => z.id?.startsWith('sim_')).length;
        setInjectedStormsCount(simulated);
    }, [heatmapZones]);

    return (
        <div className="flex-1 flex flex-col gap-5 overflow-auto custom-scrollbar">
            {/* System Health Section */}
            <div className="bg-[#1A1D27] rounded-lg border border-[#262A38] p-6">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <Server className="w-5 h-5 text-gray-400"/>
                        <h3 className="text-gray-200 font-semibold text-[15px]">Live System Health</h3>
                        <span className={`w-2 h-2 rounded-full ${isAiPaused ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></span>
                    </div>
                    <button onClick={checkStatus} disabled={checking}
                        className="flex items-center gap-2 text-xs text-gray-400 hover:text-white bg-[#242A38] border border-[#3A435A] px-3 py-1.5 rounded hover:border-gray-500 transition-colors">
                        <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`}/> Refresh
                    </button>
                </div>
                <div className="flex gap-4 flex-wrap">
                    <StatusBadge ok={backendOk} label="Spring Boot API (8080)" />
                    <StatusBadge ok={aiOk} label="FastAPI AI Service (8000)" />
                    <div className={`flex items-center gap-2 px-3 py-2 rounded border text-sm font-medium ${!isAiPaused ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-orange-500/10 border-orange-500/30 text-orange-400'}`}>
                        <Wifi className="w-4 h-4"/>
                        Telemetry: {isAiPaused ? 'Paused' : 'Streaming'}
                    </div>
                </div>
            </div>

            {/* Simulation Controls */}
            <div className="bg-[#1A1D27] rounded-lg border border-[#262A38] p-6">
                <div className="flex items-center gap-3 mb-5">
                    <Cpu className="w-5 h-5 text-blue-400"/>
                    <h3 className="text-gray-200 font-semibold text-[15px]">Simulation Engine Controls</h3>
                </div>
                <div className="flex items-center justify-between p-4 bg-[#242A38] border border-[#3A435A] rounded-lg">
                    <div>
                        <p className="text-gray-200 font-medium text-sm">Injected Storm Anomalies</p>
                        <p className="text-gray-500 text-xs mt-1">Manually simulated weather hazards currently active in the system.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={`text-2xl font-bold ${injectedStormsCount > 0 ? 'text-red-400' : 'text-green-400'}`}>{injectedStormsCount}</span>
                        <button onClick={clearStorms}
                            className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 px-4 py-2 rounded text-sm font-medium transition-colors">
                            <Trash2 className="w-4 h-4"/> Clear All Storms
                        </button>
                    </div>
                </div>
            </div>

            {/* Connection Config Display */}
            <div className="bg-[#1A1D27] rounded-lg border border-[#262A38] p-6">
                <div className="flex items-center gap-3 mb-5">
                    <Settings2 className="w-5 h-5 text-gray-400"/>
                    <h3 className="text-gray-200 font-semibold text-[15px]">Endpoint Configuration</h3>
                </div>
                <div className="space-y-3">
                    {[
                        { label: 'Backend API Base URL', value: 'http://localhost:8080' },
                        { label: 'AI Routing Service URL', value: 'http://localhost:8000' },
                        { label: 'Map Tile Provider', value: 'ArcGIS World Imagery (Dark)' },
                        { label: 'Telemetry Poll Interval', value: '3000ms (live)' },
                    ].map((cfg, i) => (
                        <div key={i} className="flex items-center justify-between py-3 border-b border-[#262A38] last:border-0">
                            <span className="text-gray-400 text-sm">{cfg.label}</span>
                            <span className="font-mono text-xs text-blue-300 bg-[#242A38] px-3 py-1 rounded border border-[#3A435A]">{cfg.value}</span>
                        </div>
                    ))}
                </div>
                <button onClick={() => toast.success('Configuration saved.')} className="mt-4 w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm font-medium">
                    Save Configuration
                </button>
            </div>
        </div>
    );
};

export default SettingsTab;
