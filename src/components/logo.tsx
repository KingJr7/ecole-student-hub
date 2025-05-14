import React from 'react';

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function Logo({ width = 40, height = 40, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg 
        width={width} 
        height={height} 
        viewBox="0 0 80 80" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="80" height="80" rx="8" fill="#4F46E5" />
        <path 
          d="M20 20H60V28H20V20ZM20 36H60V44H20V36ZM20 52H60V60H20V52Z" 
          fill="white"
        />
        <path 
          d="M24 24H40V32H24V24ZM24 40H40V48H24V40ZM24 56H40V64H24V56Z" 
          fill="#C7D2FE"
        />
      </svg>
      <span className="ml-2 text-xl font-bold text-primary hidden md:block">Ntik</span>
    </div>
  );
}
