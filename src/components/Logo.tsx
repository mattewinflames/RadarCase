import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 32 }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 64 64" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <rect width="64" height="64" rx="16" fill="#0f172a" className="fill-slate-900"/>
        
        {/* House Base */}
        <path d="M32 16L48 30V48H16V30L32 16Z" fill="#3b82f6" className="fill-blue-500"/>
        
        {/* Static Radar pulse/circles */}
        <circle cx="32" cy="34" r="10" stroke="white" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.4" />
        <circle cx="32" cy="34" r="16" stroke="white" strokeWidth="1" strokeDasharray="4 3" opacity="0.2" />
        <circle cx="32" cy="34" r="22" stroke="white" strokeWidth="0.5" opacity="0.1" />
        
        {/* Static Scanning line at 45 degrees */}
        <line x1="32" y1="34" x2="44" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        
        {/* Core point */}
        <circle cx="32" cy="34" r="2" fill="white" />
      </svg>
    </div>
  );
};

export default Logo;
