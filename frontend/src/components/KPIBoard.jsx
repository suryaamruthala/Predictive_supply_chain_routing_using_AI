import React from 'react';

const KPIBoard = ({ data }) => {
  return (
    <div className="glass-panel flex flex-col gap-3">

      <h3 className="text-lg font-semibold">📊 Metrics</h3>

      <div className="flex justify-between">
        <span>Active</span>
        <span className="text-green-400 font-bold">{data.active}</span>
      </div>

      <div className="flex justify-between">
        <span>Delayed</span>
        <span className="text-yellow-400 font-bold">{data.delayed}</span>
      </div>

      <div className="flex justify-between">
        <span>Critical</span>
        <span className="text-red-500 font-bold">{data.critical}</span>
      </div>

    </div>
  );
};

export default KPIBoard;