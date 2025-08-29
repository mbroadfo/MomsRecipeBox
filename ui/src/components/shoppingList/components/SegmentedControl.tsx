import React from 'react';
import { InfoIcon } from 'lucide-react';
// Import Tooltip directly from the components directory
import { Tooltip } from '.';
import './SegmentedControl.css';

interface SegmentOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  tooltip?: string;
  isAI?: boolean;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  fullWidth?: boolean;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({ 
  options, 
  value, 
  onChange,
  fullWidth = false
}) => {
  return (
    <div
      role="radiogroup"
      className={`segmented-control-container rounded-xl shadow-md ${fullWidth ? 'w-full' : ''}`}
      aria-label="View options"
    >
      {options.map(option => {
        const isActive = value === option.value;
        
        return (
          <div
            key={option.value}
            className={`relative ${fullWidth ? 'flex-1' : ''}`}
          >
            <button
              role="radio"
              aria-checked={isActive}
              className={`
                flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium
                w-full h-full min-w-[220px]
                segment-button ${isActive ? 'segment-button-active' : 'segment-button-inactive'}
              `}
              onClick={() => onChange(option.value)}
            >
              {option.icon && (
                <span className="w-4 h-4">{option.icon}</span>
              )}
              <span>{option.label}</span>
              
              {option.isAI && (
                <span className="ai-badge" title="AI-powered categorization">AI</span>
              )}
              
              {option.tooltip && (
                <Tooltip content={option.tooltip}>
                  <InfoIcon className="w-4 h-4 opacity-70 hover:opacity-100" />
                </Tooltip>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default SegmentedControl;
