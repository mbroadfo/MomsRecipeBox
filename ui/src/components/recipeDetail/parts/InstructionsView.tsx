import React from 'react';

export const InstructionsView: React.FC<{ steps: string[] }> = ({ steps }) => {
  if (!steps.length) return null;
  return (
    <div className="section-block">
      <h2>Instructions</h2>
      <ol className="ol-steps">{steps.map((s,i)=><li key={i}>{s}</li>)}</ol>
    </div>
  );
};
