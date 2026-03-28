import React from 'react';
import { Shield } from 'lucide-react';

const AdminRiskMonitor = ({ heatmapZones }) => {
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
                            const typeColor = zone.type === 'WEATHER' ? 'text-blue-400' : zone.type === 'TRAFFIC' ? 'text-yellow-400' : 'text-red-400';
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
};

export default AdminRiskMonitor;
