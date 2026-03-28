import React from 'react';

const Sidebar = () => {
  return (
    <div className="w-64 h-full border-r border-white/10 flex flex-col p-6 glass-panel rounded-none">
      <h3 className="text-2xl font-bold mb-8 text-primary">Logistics AI</h3>
      <ul className="flex flex-col gap-4 list-none text-textMain">
        <li className="p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-primary/20 transition-colors">Dashboard</li>
        <li className="p-3 rounded-lg cursor-pointer hover:bg-primary/20 transition-colors">Shipments</li>
        <li className="p-3 rounded-lg cursor-pointer hover:bg-primary/20 transition-colors">Risk Alerts</li>
        <li className="p-3 rounded-lg cursor-pointer hover:bg-primary/20 transition-colors">Settings</li>
      </ul>
    </div>
  );
};

export default Sidebar;
