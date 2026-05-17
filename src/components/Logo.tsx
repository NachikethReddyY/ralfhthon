import './Logo.css';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  vertical?: boolean;
}

// TODO: When auth is implemented, wrap Logo in Link to /dashboard/tickets if logged in
export function Logo({ size = 'md', showText = true, vertical = false }: LogoProps) {
  const sizeMap = {
    sm: 28,
    md: 44,
    lg: 64,
  };

  const iconSize = sizeMap[size];

  return (
    <div className={`logo logo--${size}${vertical ? ' logo--vertical' : ''}`}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 128 128"
        fill="none"
        className="logo-icon"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="lg-grad" x1="64" y1="0" x2="64" y2="128" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF8A5B" />
            <stop offset="34%" stopColor="#FF7AAE" />
            <stop offset="68%" stopColor="#C084FC" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
          <filter id="lg-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feFlood floodColor="#FF8A5B" floodOpacity="0.22" result="warm" />
            <feFlood floodColor="#C084FC" floodOpacity="0.18" result="cool" />
            <feComposite in="warm" in2="blur" operator="in" result="warmGlow" />
            <feComposite in="cool" in2="blur" operator="in" result="coolGlow" />
            <feMerge>
              <feMergeNode in="warmGlow" />
              <feMergeNode in="coolGlow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d="M64 0Q64 64 128 64Q64 64 64 128Q64 64 0 64Q64 64 64 0Z"
          fill="url(#lg-grad)"
          filter="url(#lg-glow)"
        />
      </svg>

      {showText && <span className="logo-text">Lumina</span>}
    </div>
  );
}

export default Logo;
