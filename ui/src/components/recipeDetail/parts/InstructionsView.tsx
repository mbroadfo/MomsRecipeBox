import React from 'react';

export const InstructionsView: React.FC<{ instructions: string[] }> = ({ instructions }) => {
  if (!instructions.length) return null;
  return (
    <div className="section-block">
      <h2>Instructions</h2>
      <div>
        <ol className="ol-steps" style={{ paddingLeft: '1.2rem', margin:0 }}>
          {instructions.reduce<{ elements: React.ReactNode[]; stepNumber: number }>((acc, raw, i) => {
            const isHeader = /^\s*#/.test(raw);
            if (isHeader) {
              const text = raw.replace(/^\s*#\s*/, '').trim();
              acc.elements.push(
                <li key={i} className="instruction-header" style={{ listStyle:'none', marginTop: acc.elements.length ? '1.1rem' : 0, paddingLeft:0 }}>
                  <span className="instruction-header-text">{text}</span>
                </li>
              );
            } else {
              acc.elements.push(<li key={i}>{raw}</li>);
              acc.stepNumber += 1;
            }
            return acc;
          }, { elements: [], stepNumber: 1 }).elements}
        </ol>
      </div>
    </div>
  );
};
