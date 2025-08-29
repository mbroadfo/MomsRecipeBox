import React from 'react';

interface ChipProps {
  count: number;
  total?: number;
  variant?: 'default' | 'subtle' | 'outline' | 'danger' | 'primary' | 'success';
}

const Chip: React.FC<ChipProps> = ({ count, total, variant = 'default' }) => {
  const baseClasses = "inline-flex items-center justify-center text-xs font-medium px-2 py-0.5 rounded-full";
  
  const variantClasses = {
    default: "bg-blue-600/20 text-white",
    subtle: "bg-gray-100 text-gray-700",
    outline: "bg-white text-gray-700 border border-gray-300",
    danger: "bg-red-100 text-red-700",
    primary: "bg-blue-100 text-blue-700",
    success: "bg-green-100 text-green-700"
  };
  
  return (
    <span className={`${baseClasses} ${variantClasses[variant]}`}>
      {total ? `${count}/${total}` : count}
    </span>
  );
};

export default Chip;
