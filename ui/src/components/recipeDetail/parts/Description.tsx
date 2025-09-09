import React from 'react';

interface Props { 
  value?: string; 
  editing: boolean; 
  onChange: (value: string) => void; 
}

export const Description: React.FC<Props> = ({ value, editing, onChange }) => {
  if (!editing && !value) return null;

  return (
    <div className="section-block description-section">
      {editing ? (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '.75rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '.5rem' }}>
            Description
          </label>
          <textarea
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            placeholder="Add a brief description of this recipe..."
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '.5rem',
              fontSize: '.875rem',
              fontFamily: 'inherit',
              resize: 'vertical',
              backgroundColor: '#fafafa'
            }}
          />
        </div>
      ) : (
        value && (
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '.875rem', fontWeight: 600, color: '#374151', marginBottom: '.5rem' }}>
              Description
            </h3>
            <p style={{ fontSize: '.875rem', color: '#6b7280', lineHeight: '1.5' }}>
              {value}
            </p>
          </div>
        )
      )}
    </div>
  );
};
