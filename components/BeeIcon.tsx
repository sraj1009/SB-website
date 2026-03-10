import React from 'react';

interface BeeIconProps {
  className?: string;
  size?: number;
}

/** SinggleBee brand icon - simple bee/hexagon SVG (replaces lucide Bee) */
const BeeIcon: React.FC<BeeIconProps> = ({ className = '', size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d="M12 2L22 8.5L22 15.5L12 22L2 15.5L2 8.5L12 2Z" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 9V12" />
    <path d="M12 12V15" />
    <path d="M9 12H12" />
    <path d="M12 12H15" />
  </svg>
);

export default BeeIcon;
