import React, { useEffect, useState } from 'react';

/**
 * High-fidelity decorative background for the Welcome Screen
 * Features:
 * - Dynamic Cursor Proximity Glow (nodes and wires brighten interactively near the cursor)
 * - True S-Curve connection in the top-right corner
 * - Static background layout (no camera rotation)
 * - Single-point side connections (no bottom wire connections on nodes)
 * - Converging dual-wire inputs/outputs into single side port handles
 * - Mix of Text Nodes and tall Image Nodes with SVG picture frames
 */
export const WelcomeBackgroundElements: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Use requestAnimationFrame for smooth non-blocking state updates if desired, 
      // but direct state update is usually fine for simple tracking.
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const Defs = () => (
    <defs>
      {/* Dot Grid Matrix (Subtle) */}
      <pattern id="welcome-matrix-grid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
        <circle cx="16" cy="16" r="1.2" fill="#00d2ff" fillOpacity="0.07" />
      </pattern>

      {/* Node Dark Translucent Fill */}
      <linearGradient id="node-fill-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0a1528" stopOpacity="0.82" />
        <stop offset="100%" stopColor="#040812" stopOpacity="0.72" />
      </linearGradient>

      {/* Image Thumbnail Fill */}
      <linearGradient id="image-thumb-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0c203b" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#030b18" stopOpacity="0.9" />
      </linearGradient>

      {/* Node Border: Bright at Left (100% cyan), fading out to Right (opacity 0.05) */}
      <linearGradient id="border-fade-from-left" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#00f7ff" stopOpacity="0.95" />
        <stop offset="30%" stopColor="#00c8ff" stopOpacity="0.55" />
        <stop offset="70%" stopColor="#0077ff" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#0033aa" stopOpacity="0.05" />
      </linearGradient>

      {/* Node Border: Bright at Right (100% cyan), fading out to Left (opacity 0.05) */}
      <linearGradient id="border-fade-to-right" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#0033aa" stopOpacity="0.05" />
        <stop offset="30%" stopColor="#0077ff" stopOpacity="0.2" />
        <stop offset="70%" stopColor="#00c8ff" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#00f7ff" stopOpacity="0.95" />
      </linearGradient>

      {/* Wire Gradient Glow */}
      <linearGradient id="wire-cyan-glow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00f7ff" stopOpacity="0.85" />
        <stop offset="50%" stopColor="#00d2ff" stopOpacity="0.75" />
        <stop offset="100%" stopColor="#0088ff" stopOpacity="0.65" />
      </linearGradient>

      {/* Refrained Wire Filter */}
      <filter id="wire-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Restrained Subdued Dot Glow Filter */}
      <filter id="dot-pulse-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.5" result="blur1" />
        <feGaussianBlur stdDeviation="1" result="blur2" />
        <feMerge>
          <feMergeNode in="blur1" />
          <feMergeNode in="blur2" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );

  const SchematicNodes = () => (
    <>
      {/* ============================================================ */}
      {/* LEFT SIDE SCHEMATIC                                         */}
      {/* ============================================================ */}

      {/* Node L1: Outer Top Left (Text Node) */}
      <rect x="-40" y="140" width="200" height="70" rx="18" fill="url(#node-fill-grad)" stroke="url(#border-fade-to-right)" strokeWidth="1.5" />
      <line x1="20" y1="175" x2="110" y2="175" stroke="#00d2ff" strokeOpacity="0.25" strokeWidth="2" strokeDasharray="4 4" />

      {/* Node L2: Inner Top Left (Image Node - Tall Card) */}
      <rect x="290" y="140" width="160" height="150" rx="16" fill="url(#node-fill-grad)" stroke="url(#border-fade-from-left)" strokeWidth="1.5" />
      <line x1="306" y1="158" x2="360" y2="158" stroke="#00d2ff" strokeOpacity="0.3" strokeWidth="2" />
      <rect x="306" y="168" width="128" height="76" rx="8" fill="url(#image-thumb-grad)" stroke="#00d2ff" strokeOpacity="0.25" strokeWidth="1" />
      <g transform="translate(356, 192)" opacity="0.5">
        <rect x="0" y="0" width="28" height="20" rx="3" fill="none" stroke="#00f7ff" strokeWidth="1.5" />
        <circle cx="8" cy="6" r="2.5" fill="#00f7ff" />
        <path d="M 3 16 L 10 9 L 16 15 L 21 11 L 25 16" fill="none" stroke="#00f7ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <line x1="306" y1="258" x2="410" y2="258" stroke="#00d2ff" strokeOpacity="0.2" strokeWidth="2" strokeDasharray="4 4" />
      <line x1="306" y1="270" x2="370" y2="270" stroke="#00d2ff" strokeOpacity="0.15" strokeWidth="2" strokeDasharray="4 4" />

      {/* Wire L1 Right -> L2 Left */}
      <path d="M 160 175 C 225 175, 225 215, 290 215" fill="none" stroke="url(#wire-cyan-glow)" strokeWidth="2" filter="url(#wire-glow)" />
      
      {/* Connection Point L1 Right */}
      <rect x="157" y="170" width="6" height="10" rx="2" fill="#00f7ff" opacity="0.9" />
      <circle cx="160" cy="175" r="6.5" fill="#00f7ff" fillOpacity="0.2" filter="url(#dot-pulse-glow)" />
      <circle cx="160" cy="175" r="3.5" fill="#00ffff" />
      <circle cx="160" cy="175" r="1.8" fill="#ffffff" />

      {/* Connection Point L2 Left */}
      <rect x="287" y="210" width="6" height="10" rx="2" fill="#00f7ff" opacity="0.9" />
      <circle cx="290" cy="215" r="6.5" fill="#00f7ff" fillOpacity="0.2" filter="url(#dot-pulse-glow)" />
      <circle cx="290" cy="215" r="3.5" fill="#00ffff" />
      <circle cx="290" cy="215" r="1.8" fill="#ffffff" />


      {/* Node L3: Outer Mid Left (Image Node - Tall Card) */}
      <rect x="-30" y="330" width="150" height="140" rx="16" fill="url(#node-fill-grad)" stroke="url(#border-fade-to-right)" strokeWidth="1.5" />
      <rect x="-16" y="348" width="122" height="72" rx="8" fill="url(#image-thumb-grad)" stroke="#00d2ff" strokeOpacity="0.25" strokeWidth="1" />
      <g transform="translate(32, 370)" opacity="0.45">
        <rect x="0" y="0" width="26" height="18" rx="3" fill="none" stroke="#00f7ff" strokeWidth="1.5" />
        <circle cx="7" cy="5" r="2" fill="#00f7ff" />
        <path d="M 3 15 L 9 9 L 15 14 L 19 10 L 23 15" fill="none" stroke="#00f7ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <line x1="-16" y1="432" x2="80" y2="432" stroke="#00d2ff" strokeOpacity="0.2" strokeWidth="2" strokeDasharray="4 4" />
      <line x1="-16" y1="444" x2="50" y2="444" stroke="#00d2ff" strokeOpacity="0.15" strokeWidth="2" strokeDasharray="4 4" />

      {/* Connection Point L3 Right */}
      <rect x="117" y="395" width="6" height="10" rx="2" fill="#00f7ff" opacity="0.9" />
      <circle cx="120" cy="400" r="6.5" fill="#00e5ff" fillOpacity="0.2" filter="url(#dot-pulse-glow)" />
      <circle cx="120" cy="400" r="3.5" fill="#00ffff" />
      <circle cx="120" cy="400" r="1.8" fill="#ffffff" />


      {/* Node L5: Outer Bottom Left (Text Node) */}
      <rect x="-50" y="570" width="160" height="68" rx="18" fill="url(#node-fill-grad)" stroke="url(#border-fade-to-right)" strokeWidth="1.5" />
      <line x1="-20" y1="604" x2="60" y2="604" stroke="#00d2ff" strokeOpacity="0.2" strokeWidth="2" strokeDasharray="4 4" />

      {/* Connection Point L5 Right */}
      <rect x="107" y="599" width="6" height="10" rx="2" fill="#00f7ff" opacity="0.9" />
      <circle cx="110" cy="604" r="6.5" fill="#00c8ff" fillOpacity="0.2" filter="url(#dot-pulse-glow)" />
      <circle cx="110" cy="604" r="3.5" fill="#00e5ff" />
      <circle cx="110" cy="604" r="1.8" fill="#ffffff" />


      {/* Node L4: Inner Lower Left (Text Node) - SINGLE CONVERGENT LEFT PORT */}
      <rect x="270" y="380" width="180" height="72" rx="18" fill="url(#node-fill-grad)" stroke="url(#border-fade-from-left)" strokeWidth="1.5" />
      <line x1="300" y1="416" x2="380" y2="416" stroke="#00d2ff" strokeOpacity="0.2" strokeWidth="2" strokeDasharray="4 4" />

      {/* Wire 1: L3 Right -> L4 Left Handle */}
      <path d="M 120 400 C 195 400, 195 416, 270 416" fill="none" stroke="url(#wire-cyan-glow)" strokeWidth="2" filter="url(#wire-glow)" />

      {/* Wire 2: L5 Right -> L4 Left Handle (CONVERGING INTO SAME PORT POINT!) */}
      <path d="M 110 604 C 195 604, 195 416, 270 416" fill="none" stroke="url(#wire-cyan-glow)" strokeWidth="2" filter="url(#wire-glow)" />

      {/* Single Convergent Connection Point L4 Left */}
      <rect x="267" y="411" width="6" height="10" rx="2" fill="#00f7ff" opacity="0.9" />
      <circle cx="270" cy="416" r="6.5" fill="#00f7ff" fillOpacity="0.2" filter="url(#dot-pulse-glow)" />
      <circle cx="270" cy="416" r="3.5" fill="#00ffff" />
      <circle cx="270" cy="416" r="1.8" fill="#ffffff" />


      {/* ============================================================ */}
      {/* RIGHT SIDE SCHEMATIC (Facing Inwards, Single-Point Inputs)     */}
      {/* ============================================================ */}

      {/* Node R1: Outer Top Right (Image Node - Tall Card) */}
      <rect x="1290" y="140" width="160" height="150" rx="16" fill="url(#node-fill-grad)" stroke="url(#border-fade-from-left)" strokeWidth="1.5" />
      <rect x="1306" y="158" width="128" height="76" rx="8" fill="url(#image-thumb-grad)" stroke="#00d2ff" strokeOpacity="0.25" strokeWidth="1" />
      <g transform="translate(1356, 182)" opacity="0.5">
        <rect x="0" y="0" width="28" height="20" rx="3" fill="none" stroke="#00f7ff" strokeWidth="1.5" />
        <circle cx="8" cy="6" r="2.5" fill="#00f7ff" />
        <path d="M 3 16 L 10 9 L 16 15 L 21 11 L 25 16" fill="none" stroke="#00f7ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <line x1="1306" y1="248" x2="1410" y2="248" stroke="#00d2ff" strokeOpacity="0.2" strokeWidth="2" strokeDasharray="4 4" />
      <line x1="1306" y1="260" x2="1370" y2="260" stroke="#00d2ff" strokeOpacity="0.15" strokeWidth="2" strokeDasharray="4 4" />

      {/* Connection Point R1 Left */}
      <rect x="1287" y="210" width="6" height="10" rx="2" fill="#00f7ff" opacity="0.9" />
      <circle cx="1290" cy="215" r="6.5" fill="#00f7ff" fillOpacity="0.2" filter="url(#dot-pulse-glow)" />
      <circle cx="1290" cy="215" r="3.5" fill="#00ffff" />
      <circle cx="1290" cy="215" r="1.8" fill="#ffffff" />


      {/* Node R2: Inner Top Right (Text Node) - Shifted down for S-Curve */}
      <rect x="990" y="250" width="190" height="70" rx="18" fill="url(#node-fill-grad)" stroke="url(#border-fade-to-right)" strokeWidth="1.5" />
      <line x1="1020" y1="285" x2="1110" y2="285" stroke="#00d2ff" strokeOpacity="0.2" strokeWidth="2" strokeDasharray="4 4" />

      {/* Wire R2 Right -> R1 Left (PERFECT S-CURVE!) */}
      <path d="M 1180 285 C 1235 285, 1235 215, 1290 215" fill="none" stroke="url(#wire-cyan-glow)" strokeWidth="2.2" filter="url(#wire-glow)" />
      
      {/* Connection Point R2 Right */}
      <rect x="1177" y="280" width="6" height="10" rx="2" fill="#00f7ff" opacity="0.9" />
      <circle cx="1180" cy="285" r="6.5" fill="#00f7ff" fillOpacity="0.2" filter="url(#dot-pulse-glow)" />
      <circle cx="1180" cy="285" r="3.5" fill="#00ffff" />
      <circle cx="1180" cy="285" r="1.8" fill="#ffffff" />


      {/* Node R3: Outer Mid Right (Text Node) */}
      <rect x="1300" y="350" width="190" height="70" rx="18" fill="url(#node-fill-grad)" stroke="url(#border-fade-from-left)" strokeWidth="1.5" />
      <line x1="1330" y1="385" x2="1420" y2="385" stroke="#00d2ff" strokeOpacity="0.25" strokeWidth="2" strokeDasharray="4 4" />

      {/* Connection Point R3 Left */}
      <rect x="1297" y="380" width="6" height="10" rx="2" fill="#00f7ff" opacity="0.9" />
      <circle cx="1300" cy="385" r="6.5" fill="#00f7ff" fillOpacity="0.2" filter="url(#dot-pulse-glow)" />
      <circle cx="1300" cy="385" r="3.5" fill="#00ffff" />
      <circle cx="1300" cy="385" r="1.8" fill="#ffffff" />


      {/* Node R5: Outer Bottom Right (Text Node) */}
      <rect x="1260" y="550" width="200" height="70" rx="18" fill="url(#node-fill-grad)" stroke="url(#border-fade-from-left)" strokeWidth="1.5" />
      <line x1="1290" y1="585" x2="1390" y2="585" stroke="#00d2ff" strokeOpacity="0.2" strokeWidth="2" strokeDasharray="4 4" />

      {/* Connection Point R5 Left */}
      <rect x="1257" y="580" width="6" height="10" rx="2" fill="#00f7ff" opacity="0.9" />
      <circle cx="1260" cy="585" r="6.5" fill="#00e5ff" fillOpacity="0.2" filter="url(#dot-pulse-glow)" />
      <circle cx="1260" cy="585" r="3.5" fill="#00ffff" />
      <circle cx="1260" cy="585" r="1.8" fill="#ffffff" />


      {/* Node R4: Inner Lower Right (Image Node - Tall Card) */}
      <rect x="980" y="360" width="160" height="150" rx="16" fill="url(#node-fill-grad)" stroke="url(#border-fade-to-right)" strokeWidth="1.5" />
      <rect x="996" y="378" width="128" height="76" rx="8" fill="url(#image-thumb-grad)" stroke="#00d2ff" strokeOpacity="0.25" strokeWidth="1" />
      <g transform="translate(1046, 402)" opacity="0.5">
        <rect x="0" y="0" width="28" height="20" rx="3" fill="none" stroke="#00f7ff" strokeWidth="1.5" />
        <circle cx="8" cy="6" r="2.5" fill="#00f7ff" />
        <path d="M 3 16 L 10 9 L 16 15 L 21 11 L 25 16" fill="none" stroke="#00f7ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <line x1="996" y1="468" x2="1100" y2="468" stroke="#00d2ff" strokeOpacity="0.2" strokeWidth="2" strokeDasharray="4 4" />
      <line x1="996" y1="480" x2="1060" y2="480" stroke="#00d2ff" strokeOpacity="0.15" strokeWidth="2" strokeDasharray="4 4" />

      {/* Wire 1: R3 Left -> R4 Right Handle */}
      <path d="M 1300 385 C 1220 385, 1220 435, 1140 435" fill="none" stroke="url(#wire-cyan-glow)" strokeWidth="2" filter="url(#wire-glow)" />

      {/* Wire 2: R5 Left -> R4 Right Handle (CONVERGING INTO SAME PORT POINT!) */}
      <path d="M 1260 585 C 1190 585, 1190 435, 1140 435" fill="none" stroke="url(#wire-cyan-glow)" strokeWidth="2" filter="url(#wire-glow)" />

      {/* Single Convergent Connection Point R4 Right */}
      <rect x="1137" y="430" width="6" height="10" rx="2" fill="#00f7ff" opacity="0.9" />
      <circle cx="1140" cy="435" r="6.5" fill="#00f7ff" fillOpacity="0.2" filter="url(#dot-pulse-glow)" />
      <circle cx="1140" cy="435" r="3.5" fill="#00ffff" />
      <circle cx="1140" cy="435" r="1.8" fill="#ffffff" />
    </>
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none">
      
      {/* 1. Deep Space Central & Ambient Glows (Static) */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[580px] rounded-full blur-[140px] opacity-25 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0, 210, 255, 0.35) 0%, rgba(0, 102, 255, 0.18) 45%, rgba(11, 15, 25, 0) 75%)'
        }}
      />
      <div 
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[340px] rounded-full blur-[90px] opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0, 247, 255, 0.35) 0%, rgba(0, 136, 255, 0.15) 60%, transparent 80%)'
        }}
      />
      <div className="absolute top-1/4 left-0 w-[400px] h-[500px] bg-cyan-600/10 rounded-full blur-[130px] -translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-[450px] h-[550px] bg-blue-600/10 rounded-full blur-[140px] translate-x-1/3 pointer-events-none" />

      {/* Layer 1: Static Matrix Background */}
      <div className="absolute inset-0 z-0">
        <svg className="w-full h-full absolute inset-0" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <Defs />
          <rect width="1440" height="900" fill="url(#welcome-matrix-grid)" />
        </svg>
      </div>

      {/* Layer 2: Dimmed Base Schematic */}
      <div className="absolute inset-0 z-10 opacity-40 sm:opacity-50">
        <svg className="w-full h-full absolute inset-0" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <Defs />
          <SchematicNodes />
        </svg>
      </div>

      {/* Layer 3: Interactive Dynamic Glow (Masked by Cursor Proximity) */}
      <div 
        className="absolute inset-0 z-20 transition-opacity duration-200"
        style={{
          opacity: mousePos.x === -1000 ? 0 : 1,
          filter: 'brightness(1.55) saturate(1.4) drop-shadow(0 0 12px rgba(0, 210, 255, 0.5))',
          WebkitMaskImage: `radial-gradient(320px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,1) 15%, rgba(0,0,0,0) 100%)`,
          maskImage: `radial-gradient(320px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0,0,0,1) 15%, rgba(0,0,0,0) 100%)`
        }}
      >
        <svg className="w-full h-full absolute inset-0" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <Defs />
          <SchematicNodes />
        </svg>
      </div>

    </div>
  );
};

export default WelcomeBackgroundElements;
