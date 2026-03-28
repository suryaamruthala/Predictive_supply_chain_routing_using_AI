import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { exportAnalyticsPDF } from '../../../utils/pdfReports';

const AdminAnalytics = ({ shipments, heatmapZones, allAlerts, highRiskCount }) => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsMounted(true), 150);
        return () => clearTimeout(timer);
    }, []);

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
                <div className="flex-1 bg-[#1A1D27] rounded-lg border border-[#262A38] p-5 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5"><Activity className="w-40 h-40"/></div>
                    <h3 className="text-gray-200 font-semibold mb-6 text-[15px] relative z-10 flex items-center gap-2">
                        Neural Core Load <span className="text-[9px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded tracking-widest uppercase ml-2">Live Sync</span>
                    </h3>
                    <div className="flex flex-col justify-center gap-7 flex-1 min-h-[150px] relative z-10">
                        {statusCounts.map((s, i) => {
                            const percent = (s.count / Math.max(shipments.length, 1)) * 100;
                            const w = isMounted ? `${Math.max(2, percent)}%` : '0%';
                            return (
                                <div key={i} className="flex flex-col gap-2 group cursor-pointer">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{s.label}</span>
                                        <div className="text-right">
                                            <span className="text-lg font-black leading-none" style={{color: s.color}}>{s.count}</span>
                                            <span className="text-[9px] text-gray-500 ml-1 font-mono">{percent.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                    <div className="w-full h-1.5 bg-[#262A38] rounded-full overflow-hidden relative">
                                        <div 
                                            className="absolute top-0 left-0 h-full rounded-full transition-all duration-[1500ms] ease-out shadow-glow"
                                            style={{width: w, backgroundColor: s.color, boxShadow: `0 0 10px ${s.color}80`}}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
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
                                    <div className="h-full rounded-full transition-all duration-1000" style={{
                                        width: isMounted ? `${Math.max(2, (r.count / Math.max(shipments.length, 1)) * 100)}%` : '0%',
                                        backgroundColor: r.color
                                    }}></div>
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
};

export default AdminAnalytics;
