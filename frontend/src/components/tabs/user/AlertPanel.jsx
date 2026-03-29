import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

const AlertPanel = () => {

    const [alerts, setAlerts] = useState([]);
    const [open, setOpen] = useState(false);

    const fetchAlerts = async () => {
        try {
            const res = await fetch("http://localhost:8080/api/alerts");
            const data = await res.json();
            setAlerts(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 5000);
        return () => clearInterval(interval);
    }, []);

    const dismissAlert = async (id) => {
        await fetch(`http://localhost:8080/api/alerts/${id}`, {
            method: "DELETE"
        });
        fetchAlerts();
    };

    const getColor = (severity) => {
        if (severity === "CRITICAL") return "border-red-500 text-red-400";
        if (severity === "HIGH") return "border-yellow-400 text-yellow-300";
        return "border-green-400 text-green-300";
    };

    return (
        <div className="absolute top-6 right-6 z-[2000]">

            <div
                onClick={() => setOpen(!open)}
                className="cursor-pointer relative"
            >
                <Bell className="text-white w-6 h-6" />

                {alerts.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-xs px-1 rounded-full">
                        {alerts.length}
                    </span>
                )}
            </div>

            {open && (
                <div className="mt-3 w-80 max-h-[400px] overflow-y-auto bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4">

                    <h3 className="text-sm text-blue-400 mb-3">🔔 Alerts</h3>

                    {alerts.length === 0 ? (
                        <p className="text-xs text-gray-400">No alerts</p>
                    ) : (
                        alerts.map(alert => (
                            <div
                                key={alert.id}
                                className={`mb-3 p-3 rounded-lg border ${getColor(alert.severity)} bg-white/5`}
                            >
                                <p className="text-xs font-bold mb-1">
                                    {alert.severity}
                                </p>

                                <p className="text-xs mb-2 whitespace-pre-line">
                                    {alert.message}
                                </p>

                                <button
                                    onClick={() => dismissAlert(alert.id)}
                                    className="text-[10px] text-gray-400 hover:text-red-400"
                                >
                                    Dismiss
                                </button>
                            </div>
                        ))
                    )}

                </div>
            )}

        </div>
    );
};

export default AlertPanel;