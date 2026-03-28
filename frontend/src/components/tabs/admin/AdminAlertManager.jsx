import React from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminAlertManager = ({ allAlerts, fetchDbAlerts, handleDismissAlert }) => {
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
                    )
                }) : (
                    <div className="text-center py-16 text-gray-500 italic">
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20 text-green-500"/>
                        No alerts in the system. All dispatches running normally.
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminAlertManager;
