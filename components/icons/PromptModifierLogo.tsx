import React from 'react';

interface IconProps {
  className?: string;
  size?: number | string;
  withGlow?: boolean;
}

/**
 * Standalone Prompt Modifier Vector Glyph
 * Stylized speech balloon 'P' with 4-point glowing sparkle star.
 */
export const PromptModifierIcon: React.FC<IconProps> = ({ 
  className = "w-5 h-5", 
  size, 
  withGlow = false 
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg 
      viewBox="0 0 512 512" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 select-none ${className}`}
      style={style}
    >
      <defs>
        <linearGradient id="pm-icon-p-grad" x1="0%" y1="0%" x2="25%" y2="100%">
          <stop offset="0%" stopColor="#00f7ff" />
          <stop offset="30%" stopColor="#00d2ff" />
          <stop offset="100%" stopColor="#0066ff" />
        </linearGradient>

        <linearGradient id="pm-icon-star-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a5f3fc" />
          <stop offset="40%" stopColor="#00d2ff" />
          <stop offset="100%" stopColor="#0077ff" />
        </linearGradient>

        <radialGradient id="pm-icon-star-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00f7ff" stopOpacity="0.4" />
          <stop offset="60%" stopColor="#00d2ff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#0066ff" stopOpacity="0" />
        </radialGradient>

        {withGlow && (
          <filter id="pm-icon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        )}
      </defs>

      {/* Optional ambient backdrop glow */}
      {withGlow && (
        <circle cx="256" cy="226" r="140" fill="url(#pm-icon-star-glow)" />
      )}

      {/* Main Stylized 'P' Chat Bubble Shape */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 100 76
           L 322 76
           A 90 90 0 0 1 412 166
           L 412 250
           A 90 90 0 0 1 322 340
           L 264 340
           L 168 436
           L 100 436
           L 100 76
           Z
           M 168 144
           L 298 144
           A 46 46 0 0 1 344 190
           L 344 226
           A 46 46 0 0 1 298 272
           L 264 272
           L 168 368
           L 168 144
           Z"
        fill="url(#pm-icon-p-grad)"
        filter={withGlow ? "url(#pm-icon-glow)" : undefined}
      />

      {/* Sparkle Star inside the loop */}
      <path
        d="M 256 154
           C 256 193 222 218 190 218
           C 222 218 256 243 256 282
           C 256 243 290 218 322 218
           C 290 218 256 193 256 154
           Z"
        fill="url(#pm-icon-star-grad)"
      />
    </svg>
  );
};

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showVersion?: boolean;
  version?: string;
  className?: string;
  iconClassName?: string;
  hasActiveWork?: boolean;
}

/**
 * Prompt Modifier Header & Display Logo
 * Features:
 * - Stylized Vector 'P' Sparkle Icon
 * - "Prompt" in White (#FFFFFF)
 * - "Modifier" in Cyan (#00d2ff / #38bdf8)
 */
export const PromptModifierLogo: React.FC<LogoProps> = ({
  size = 'md',
  showVersion = false,
  version,
  className = '',
  iconClassName = '',
  hasActiveWork = false
}) => {
  const sizeStyles = {
    sm: {
      icon: 'w-4 h-4',
      text: 'text-xs',
      gap: 'gap-1.5',
      versionText: 'text-[9px] px-1 py-0.2',
    },
    md: {
      icon: 'w-5 h-5',
      text: 'text-sm font-bold',
      gap: 'gap-2',
      versionText: 'text-[10px] px-1.5 py-0.5',
    },
    lg: {
      icon: 'w-8 h-8',
      text: 'text-2xl font-extrabold',
      gap: 'gap-3',
      versionText: 'text-xs px-2 py-0.5',
    },
    xl: {
      icon: 'w-14 h-14 md:w-16 md:h-16',
      text: 'text-4xl sm:text-6xl md:text-7xl font-black',
      gap: 'gap-4 sm:gap-6',
      versionText: 'text-sm px-3 py-1',
    }
  }[size];

  return (
    <div className={`flex items-center ${sizeStyles.gap} select-none ${className}`}>
      {/* Icon with active ping pulse badge if busy */}
      <div className="relative flex items-center justify-center flex-shrink-0">
        <PromptModifierIcon className={`${sizeStyles.icon} ${iconClassName}`} withGlow={size === 'lg' || size === 'xl'} />
        {hasActiveWork && (
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
          </span>
        )}
      </div>

      {/* Styled Wordmark: "Prompt" in white, "Modifier" in cyan */}
      <div className={`flex items-baseline tracking-tight font-sans ${sizeStyles.text}`}>
        <span 
          className="text-white font-extrabold tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
          style={{ fontFamily: "'Plus Jakarta Sans', 'Outfit', system-ui, -apple-system, sans-serif" }}
        >
          Prompt
        </span>
        <span className="w-1.5"></span>
        <span 
          className="text-[#00d2ff] font-extrabold tracking-tight drop-shadow-[0_0_12px_rgba(0,210,255,0.4)]"
          style={{ fontFamily: "'Plus Jakarta Sans', 'Outfit', system-ui, -apple-system, sans-serif" }}
        >
          Modifier
        </span>
      </div>

      {/* Optional Version Pill */}
      {showVersion && version && (
        <span className={`font-mono text-gray-400 bg-gray-800/90 rounded border border-gray-700/80 ${sizeStyles.versionText}`}>
          {version}
        </span>
      )}
    </div>
  );
};

/**
 * Pure 100% Standalone Vector SVG Logo (Icon + Text combined in one SVG)
 */
export const PromptModifierSvgLogo: React.FC<{
  width?: number | string;
  height?: number | string;
  className?: string;
}> = ({ width = 340, height = 70, className = "" }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 340 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="svg-p-grad" x1="0%" y1="0%" x2="25%" y2="100%">
          <stop offset="0%" stopColor="#00f7ff" />
          <stop offset="35%" stopColor="#00d2ff" />
          <stop offset="100%" stopColor="#0066ff" />
        </linearGradient>

        <linearGradient id="svg-star-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a5f3fc" />
          <stop offset="45%" stopColor="#00d2ff" />
          <stop offset="100%" stopColor="#0077ff" />
        </linearGradient>

        <linearGradient id="svg-text-cyan-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00f0ff" />
          <stop offset="100%" stopColor="#00b4d8" />
        </linearGradient>
      </defs>

      {/* Icon scaled down to 54x54 */}
      <g transform="translate(6, 8) scale(0.105)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M 100 76
             L 322 76
             A 90 90 0 0 1 412 166
             L 412 250
             A 90 90 0 0 1 322 340
             L 264 340
             L 168 436
             L 100 436
             L 100 76
             Z
             M 168 144
             L 298 144
             A 46 46 0 0 1 344 190
             L 344 226
             A 46 46 0 0 1 298 272
             L 264 272
             L 168 368
             L 168 144
             Z"
          fill="url(#svg-p-grad)"
        />
        <path
          d="M 256 154
             C 256 193 222 218 190 218
             C 222 218 256 243 256 282
             C 256 243 290 218 322 218
             C 290 218 256 193 256 154
             Z"
          fill="url(#svg-star-grad)"
        />
      </g>

      {/* Typography: "Prompt" in White, "Modifier" in Cyan */}
      <text
        x="68"
        y="45"
        fill="#FFFFFF"
        fontFamily="'Plus Jakarta Sans', 'Outfit', system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="28"
        letterSpacing="-0.5"
      >
        Prompt
      </text>
      <text
        x="180"
        y="45"
        fill="url(#svg-text-cyan-grad)"
        fontFamily="'Plus Jakarta Sans', 'Outfit', system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="28"
        letterSpacing="-0.5"
      >
        Modifier
      </text>
    </svg>
  );
};
export default PromptModifierLogo;
