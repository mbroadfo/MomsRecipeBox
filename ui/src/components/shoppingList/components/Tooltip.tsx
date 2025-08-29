import React, { useState, useRef } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, placement = 'bottom' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = useRef(`tooltip-${Math.random().toString(36).substring(2, 9)}`).current;

  const placementClasses = {
    top: "bottom-full mb-2",
    bottom: "top-full mt-2",
    left: "right-full mr-2",
    right: "left-full ml-2"
  };

  return (
    <div className="relative inline-flex">
      <div
        className="inline-flex"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        aria-describedby={tooltipId}
      >
        {/* We render the children directly */}
        {children}
      </div>

      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`
            fixed z-50 w-72 p-3 text-sm text-left bg-gray-800 text-white rounded-lg
            left-1/2 transform -translate-x-1/2
            ${placementClasses[placement]} 
            shadow-lg
            opacity-100 transition-opacity duration-150
          `}
        >
          {content}
          <div 
            className={`
              absolute w-2 h-2 bg-gray-800 rotate-45
              ${placement === 'top' ? 'bottom-0 left-1/2 -translate-x-1/2 -mb-1' : ''}
              ${placement === 'bottom' ? 'top-0 left-1/2 -translate-x-1/2 -mt-1' : ''}
              ${placement === 'left' ? 'right-0 top-1/2 -translate-y-1/2 -mr-1' : ''}
              ${placement === 'right' ? 'left-0 top-1/2 -translate-y-1/2 -ml-1' : ''}
            `}
          />
        </div>
      )}
    </div>
  );
};

export default Tooltip;
