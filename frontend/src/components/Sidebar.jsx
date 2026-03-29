import React from 'react';

const Sidebar = ({ setActiveTab }) => {
  return (
    <div className="w-64 m-4 rounded-2xl glass-panel flex flex-col justify-between">

      <div>
        <h2 className="text-2xl font-bold mb-8 text-blue-400">
          ⚡ Logistics AI
        </h2>

        <div className="flex flex-col gap-2">

          {["Dashboard", "Live Tracking", "Shipments", "AI Alerts", "Settings"].map((item) => (
            <div
              key={item}
              onClick={() => {
                console.log("CLICKED:", item);
                setActiveTab(item);
              }}
              className="p-3 rounded-lg cursor-pointer hover:bg-white/10 transition-all"
            >
              {item}
            </div>
          ))}

        </div>
      </div>

      <div className="text-xs text-gray-400">
        AI Powered System v1.0
      </div>

    </div>
  );
};

export default Sidebar;