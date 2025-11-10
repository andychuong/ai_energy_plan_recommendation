/**
 * SparkSave Logo Component
 * Displays the SparkSave logo with customizable size
 */

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

export function Logo({ size = 'md', className = '' }: LogoProps) {
  return (
    <svg
      className={`${sizeMap[size]} ${className}`}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle */}
      <circle cx="100" cy="100" r="95" fill="#FCD34D" opacity="0.2" />

      {/* Outer glow */}
      <circle cx="100" cy="100" r="85" fill="url(#glow)" opacity="0.3" />

      {/* Lightning bolt (spark) */}
      <path
        d="M100 30 L70 85 L90 85 L80 130 L130 75 L110 75 L120 30 Z"
        fill="url(#lightning)"
        stroke="#F59E0B"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Coin/savings circle */}
      <circle
        cx="140"
        cy="140"
        r="30"
        fill="#10B981"
        stroke="#059669"
        strokeWidth="3"
      />
      <text
        x="140"
        y="150"
        textAnchor="middle"
        fontSize="24"
        fontWeight="bold"
        fill="white"
      >
        $
      </text>

      {/* Gradients */}
      <defs>
        <linearGradient
          id="lightning"
          x1="100"
          y1="30"
          x2="100"
          y2="130"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="50%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>

        <radialGradient
          id="glow"
          cx="100"
          cy="100"
          r="85"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FCD34D" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
