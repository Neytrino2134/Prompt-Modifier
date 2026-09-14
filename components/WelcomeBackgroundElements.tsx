import React from 'react';

/**
 * High-fidelity decorative background for the Welcome Screen
 * Strictly aligned with the visual concept:
 * - Ambient radial glows (deep space neon cyan / cobalt blue)
 * - Dot matrix background grid
 * - Floating side node capsules with glowing circuit traces and terminal glow dots
 */
export const WelcomeBackgroundElements: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none">
      {/* 1. Deep Space Central & Ambient Glows */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[550px] rounded-full blur-[140px] opacity-45 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0, 210, 255, 0.35) 0%, rgba(0, 102, 255, 0.18) 45%, rgba(11, 15, 25, 0) 75%)'
        }}
      />
      <div 
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] h-[320px] rounded-full blur-[90px] opacity-55 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0, 247, 255, 0.45) 0%, rgba(0, 136, 255, 0.18) 60%, transparent 80%)'
        }}
      />

      {/* 2. Side Ambient Glows */}
      <div className="absolute top-1/4 left-0 w-[350px] h-[450px] bg-cyan-600/12 rounded-full blur-[130px] -translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-[400px] h-[500px] bg-blue-600/12 rounded-full blur-[140px] translate-x-1/3 pointer-events-none" />

      {/* 3. High-Precision Vector Circuit Canvas */}
      <svg 
        className="w-full h-full absolute inset-0"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Dot Grid Matrix */}
          <pattern id="welcome-matrix-grid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="16" cy="16" r="1.2" fill="#00d2ff" fillOpacity="0.12" />
          </pattern>

          {/* Node Gradient Fill */}
          <linearGradient id="node-fill-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a1528" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#050a14" stopOpacity="0.75" />
          </linearGradient>

          {/* Node Cyan Gradient Borders */}
          <linearGradient id="node-border-left" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#0077ff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0044aa" stopOpacity="0.1" />
          </linearGradient>

          <linearGradient id="node-border-right" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#0077ff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0044aa" stopOpacity="0.1" />
          </linearGradient>

          {/* Glow Filters */}
          <filter id="wire-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="dot-pulse-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Global Dot Grid Matrix */}
        <rect width="1440" height="900" fill="url(#welcome-matrix-grid)" />

        {/* LEFT SIDE: Decorative Floating Nodes and Circuit Cables (Concept Inspired) */}
        <g className="opacity-80 sm:opacity-95">
          {/* Node 1: Top Left Outer Capsule */}
          <rect 
            x="-40" 
            y="180" 
            width="200" 
            height="74" 
            rx="18" 
            fill="url(#node-fill-grad)" 
            stroke="url(#node-border-left)" 
            strokeWidth="1.5" 
          />
          {/* Inner Accent Line in Node 1 */}
          <line x1="20" y1="217" x2="110" y2="217" stroke="#00d2ff" strokeOpacity="0.3" strokeWidth="2" strokeDasharray="4 4" />

          {/* Wire 1 snaking from Node 1 */}
          <path 
            d="M 160 217 C 240 217, 220 330, 310 330" 
            fill="none" 
            stroke="#00d2ff" 
            strokeWidth="2" 
            strokeOpacity="0.8"
            filter="url(#wire-glow)"
          />
          <circle cx="160" cy="217" r="4.5" fill="#00f7ff" filter="url(#dot-pulse-glow)" />
          <circle cx="310" cy="330" r="4.5" fill="#00f7ff" filter="url(#dot-pulse-glow)" />

          {/* Node 2: Mid Left Capsule */}
          <rect 
            x="-30" 
            y="320" 
            width="150" 
            height="64" 
            rx="16" 
            fill="url(#node-fill-grad)" 
            stroke="url(#node-border-left)" 
            strokeWidth="1.5" 
          />

          {/* Wire 2 from Node 2 */}
          <path 
            d="M 120 352 C 200 352, 190 460, 270 460" 
            fill="none" 
            stroke="#00a8ff" 
            strokeWidth="1.75" 
            strokeOpacity="0.75"
            filter="url(#wire-glow)"
          />
          <circle cx="120" cy="352" r="4" fill="#00e5ff" filter="url(#dot-pulse-glow)" />
          <circle cx="270" cy="460" r="4" fill="#00e5ff" filter="url(#dot-pulse-glow)" />

          {/* Branch line downwards */}
          <path 
            d="M 270 460 C 220 540, 180 590, 80 610" 
            fill="none" 
            stroke="#0077ff" 
            strokeWidth="1.5" 
            strokeOpacity="0.55"
            filter="url(#wire-glow)"
          />
          <circle cx="80" cy="610" r="3.5" fill="#00c8ff" />
        </g>

        {/* RIGHT SIDE: Decorative Floating Nodes and Circuit Cables (Concept Inspired) */}
        <g className="opacity-80 sm:opacity-95">
          {/* Node 1: Mid-Right Capsule */}
          <rect 
            x="1300" 
            y="360" 
            width="180" 
            height="70" 
            rx="18" 
            fill="url(#node-fill-grad)" 
            stroke="url(#node-border-right)" 
            strokeWidth="1.5" 
          />
          <line x1="1330" y1="395" x2="1400" y2="395" stroke="#00d2ff" strokeOpacity="0.3" strokeWidth="2" strokeDasharray="4 4" />

          {/* Wire 1 curving inwards from Mid-Right Node */}
          <path 
            d="M 1300 395 C 1210 395, 1200 500, 1120 500" 
            fill="none" 
            stroke="#00d2ff" 
            strokeWidth="2" 
            strokeOpacity="0.85"
            filter="url(#wire-glow)"
          />
          <circle cx="1300" cy="395" r="4.5" fill="#00f7ff" filter="url(#dot-pulse-glow)" />
          <circle cx="1120" cy="500" r="4.5" fill="#00f7ff" filter="url(#dot-pulse-glow)" />

          {/* Node 2: Lower Right Capsule */}
          <rect 
            x="1260" 
            y="490" 
            width="220" 
            height="66" 
            rx="16" 
            fill="url(#node-fill-grad)" 
            stroke="url(#node-border-right)" 
            strokeWidth="1.5" 
          />

          {/* Node 3: Bottom Right Shelf Capsule */}
          <rect 
            x="1180" 
            y="620" 
            width="300" 
            height="64" 
            rx="16" 
            fill="url(#node-fill-grad)" 
            stroke="url(#node-border-right)" 
            strokeWidth="1.5" 
          />

          {/* Wire connecting down to bottom right shelf */}
          <path 
            d="M 1120 500 C 1140 570, 1130 620, 1180 652" 
            fill="none" 
            stroke="#0099ff" 
            strokeWidth="1.75" 
            strokeOpacity="0.7"
            filter="url(#wire-glow)"
          />
          <circle cx="1180" cy="652" r="4" fill="#00e5ff" filter="url(#dot-pulse-glow)" />
        </g>
      </svg>
    </div>
  );
};

export default WelcomeBackgroundElements;
