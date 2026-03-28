import React from 'react';

const KPIBoard = ({ data }) => {
  return (
    <div className="glass-panel w-72 flex flex-col gap-4 bg-slate-900/80">
      <h3 className="border-b border-white/10 pb-2 text-lg font-semibold text-textMain">Metrics Overview</h3>
      
      <div className="flex justify-between items-center">
        <span className="text-textMuted">Active Shipments</span>
        <span className="text-xl font-bold text-textMain">{data.active}</span>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="text-textMuted">Delayed</span>
        <span className="text-xl font-bold text-warning">{data.delayed}</span>
      </div>
      
      <div className="flex justify-between items-center">
        <span className="text-textMuted">Critical Risk</span>
        <span className="text-xl font-bold text-danger">{data.critical}</span>
      </div>
    </div>
  );
};

export default KPIBoard;
