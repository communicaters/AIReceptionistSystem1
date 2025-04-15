import React from 'react';

export interface SpinnerProps {
  size?: 'sm' | 'small' | 'medium' | 'large' | 'lg';
  color?: 'primary' | 'white';
  className?: string;
}

const Spinner = ({ size = 'medium', color = 'primary', className = '' }: SpinnerProps) => {
  // Normalize size values
  const normalizedSize = size === 'sm' ? 'small' : size === 'lg' ? 'large' : size;
  
  const sizeMap = {
    small: 'h-4 w-4 border-2',
    medium: 'h-8 w-8 border-4',
    large: 'h-12 w-12 border-4'
  };
  
  const colorMap = {
    primary: 'border-primary border-t-transparent',
    white: 'border-white border-t-transparent'
  };
  
  return (
    <div 
      className={`animate-spin rounded-full ${sizeMap[normalizedSize]} ${colorMap[color]} ${className}`} 
      role="status" 
      aria-label="Loading"
    />
  );
};

export { Spinner };
export default Spinner;