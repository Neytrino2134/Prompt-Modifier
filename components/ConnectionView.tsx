
import React, { useState, useId } from 'react';
import type { Point, Connection, Tool, Node, LineStyle } from '../types';
import { NodeType, DEFAULT_CONNECTION_ANIMATION_CONFIG } from '../types';
import { getOutputHandleType, COLLAPSED_NODE_HEIGHT } from '../utils/nodeUtils';
import { useAppContext } from '../contexts/AppContext';
import { getActiveCursorDefinition } from './cursors/cursorDefinitions';
import { 
  getEffectiveConnectionColor, 
  getNeonFlowGradientStops, 
  CYBER_TRON_GRADATIONS 
} from './settings/appearance/connectionAnimationDefinitions';

interface ConnectionViewProps {
  connection: Connection;
  fromNode: Node;
  toNode: Node; // Added toNode prop
  start: Point;
  end: Point;
  isNodeHovered: boolean;
  activeTool: Tool;
  onDelete: (connectionId: string) => void;
  onSplit: (connectionId: string) => void;
  lineStyle: LineStyle;
}

const ConnectionView: React.FC<ConnectionViewProps> = ({ 
    connection,
    fromNode,
    toNode, // Added toNode prop
    start, 
    end, 
    isNodeHovered,
    activeTool,
    onDelete,
    onSplit,
    lineStyle,
}) => {
  const context = useAppContext();
  const { 
    isConnectionAnimationEnabled, 
    connectionOpacity, 
    connectionAnimationConfig, 
    cursorSkin, 
    currentTheme 
  } = context || { 
    isConnectionAnimationEnabled: true, 
    connectionOpacity: 0.4, 
    connectionAnimationConfig: DEFAULT_CONNECTION_ANIMATION_CONFIG,
    cursorSkin: 'default', 
    currentTheme: 'cyan' 
  };

  const animConfig = connectionAnimationConfig || DEFAULT_CONNECTION_ANIMATION_CONFIG;
  const animStyle = animConfig.style || 'cyber_tron';
  const [isLineHovered, setIsLineHovered] = useState(false);
  const uniqueFilterId = useId().replace(/:/g, '_');

  // Helper to get effective dimensions (collapsed vs full)
  const getNodeEffectiveRect = (node: Node) => {
      const height = node.isCollapsed ? COLLAPSED_NODE_HEIGHT : node.height;
      return {
          x: node.position.x,
          y: node.position.y,
          width: node.width,
          height: height,
          right: node.position.x + node.width,
          bottom: node.position.y + height
      };
  };

  const getSmartOrthogonalPath = (start: Point, end: Point, sourceNode: Node, targetNode: Node) => {
    // 0. Get Rects for collision avoidance
    const srcRect = getNodeEffectiveRect(sourceNode);
    const tgtRect = getNodeEffectiveRect(targetNode);
    
    // 1. Determine Directions based on Node Type and State
    const getExitDirection = (node: Node) => {
        if (node.type !== NodeType.REROUTE_DOT) return 1; // Default Right for standard output
        try {
            const val = JSON.parse(node.value || '{}');
            return val.direction === 'RL' ? -1 : 1; // RL exits Left (-1), LR exits Right (1)
        } catch { return 1; }
    };

    const getEntryDirection = (node: Node) => {
        if (node.type !== NodeType.REROUTE_DOT) return -1; // Default Left for standard input
        try {
            const val = JSON.parse(node.value || '{}');
            return val.direction === 'RL' ? 1 : -1; // RL enters Right (1), LR enters Left (-1)
        } catch { return -1; }
    };

    const sourceDir = getExitDirection(sourceNode);
    const targetDir = getEntryDirection(targetNode);
    
    // Reduced Margin for tighter turns
    const MARGIN = 20;

    // --- STANDARD ROUTING ---

    // 2. COMPACT MODE (Heuristic check for standard flows that are close horizontally)
    const isStandardFlow = (end.x > start.x && sourceDir === 1 && targetDir === -1);
    const isReverseFlow = (end.x < start.x && sourceDir === -1 && targetDir === 1);
    
    // Check if reroute dots are involved
    const isRerouteInvolved = sourceNode.type === NodeType.REROUTE_DOT || targetNode.type === NodeType.REROUTE_DOT;

    // Define threshold for compact mode: smaller for reroute nodes to prefer custom routing
    const compactThreshold = isRerouteInvolved ? 30 : 150;

    // Apply compact mode (simple Z-shape) if nodes are close enough
    if ((isStandardFlow && end.x < start.x + compactThreshold) || (!isRerouteInvolved && isReverseFlow && end.x > start.x - 400)) {
         const midX = (start.x + end.x) / 2;
         return `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
    }

    // Reduced GAP_THRESHOLD to 0 to allow routing between nodes even with minimal space
    const GAP_THRESHOLD = 0; 
    const path: string[] = [`M ${start.x} ${start.y}`];

    // 3. Initial Step Out
    // Move MARGIN distance in the Exit Direction
    let currentX = start.x + (sourceDir * MARGIN);
    let currentY = start.y;
    path.push(`L ${currentX} ${currentY}`);

    // 4. Determine Goal Entry Point
    // Target entry point is MARGIN distance in the Entry Direction (opposite to face)
    const targetEntryX = end.x + (targetDir * MARGIN); 
    const targetEntryY = end.y;

    // 5. Logic Branching
    
    // Check if we can do a simple mid-step
    // Standard L->R: currentX < targetEntryX
    // Reverse R->L: currentX > targetEntryX
    const canGoDirect = (sourceDir === 1 && targetDir === -1 && targetEntryX > currentX) || 
                        (sourceDir === -1 && targetDir === 1 && targetEntryX < currentX);

    if (canGoDirect) {
        if (targetNode.type === NodeType.REROUTE_DOT) {
             // Case 1: Going TO a Reroute Node (Standard or close distance)
             // Turn immediately at the source (currentX) to align with Target Y
             path.push(`L ${currentX} ${targetEntryY}`); 
             path.push(`L ${targetEntryX} ${targetEntryY}`); 
        } 
        else if (sourceNode.type === NodeType.REROUTE_DOT) {
             // Case 2: Coming FROM a Reroute Node
             // Keep straight line out of reroute, turn at the target (targetEntryX)
             path.push(`L ${targetEntryX} ${currentY}`);
             path.push(`L ${targetEntryX} ${targetEntryY}`);
        }
        else {
             // Standard Nodes: Turn at the mid-point (Z-shape)
             const midX = (currentX + targetEntryX) / 2;
             path.push(`L ${midX} ${currentY}`);
             path.push(`L ${midX} ${targetEntryY}`);
             path.push(`L ${targetEntryX} ${targetEntryY}`);
        }
    } 
    else {
        // Complex routing (Going backwards or blocked)
        
        // REROUTE DOT SIMPLIFICATION
        // If a reroute dot is involved and directions match (e.g. Left->Left or Right->Right),
        // force a simple C-shape / U-turn without bounding box checks.
        if (isRerouteInvolved && sourceDir === targetDir) {
             let turningX = 0;
             if (sourceDir === -1) {
                 // Both Left: Find furthest left point
                 turningX = Math.min(currentX, targetEntryX); 
             } else {
                 // Both Right: Find furthest right point
                 turningX = Math.max(currentX, targetEntryX);
             }
             
             path.push(`L ${turningX} ${currentY}`); // Move out to turning point
             path.push(`L ${turningX} ${targetEntryY}`); // Move vertical
             path.push(`L ${targetEntryX} ${targetEntryY}`); // Move in to target
        } 
        else {
            // Standard "Around the Box" Logic
            let safeY = 0;
            
            // Vertical Clearance Check with reduced threshold
            if (tgtRect.bottom + GAP_THRESHOLD < srcRect.y) {
                safeY = (tgtRect.bottom + srcRect.y) / 2;
            } else if (tgtRect.y > srcRect.bottom + GAP_THRESHOLD) {
                safeY = (srcRect.bottom + tgtRect.y) / 2;
            } else {
                // Overlapping vertical space - go around
                const goUp = end.y < start.y;
                if (goUp) {
                    const highestTop = Math.min(srcRect.y, tgtRect.y);
                    safeY = highestTop - MARGIN;
                } else {
                    const lowestBot = Math.max(srcRect.bottom, tgtRect.bottom);
                    safeY = lowestBot + MARGIN;
                }
            }

            path.push(`L ${currentX} ${safeY}`); // Vertical clear
            path.push(`L ${targetEntryX} ${safeY}`); // Horizontal cross
            path.push(`L ${targetEntryX} ${targetEntryY}`); // Vertical to target
        }
    }

    // 6. Final Step In
    path.push(`L ${end.x} ${end.y}`);

    return path.join(" ");
  };

  const pathData = lineStyle === 'orthogonal'
    ? getSmartOrthogonalPath(start, end, fromNode, toNode)
    : `M ${start.x} ${start.y} C ${start.x + 80} ${start.y}, ${end.x - 80} ${end.y}, ${end.x} ${end.y}`;

  const fromType = getOutputHandleType(fromNode, connection.fromHandleId);
  const defaultColor = '#6b7280'; // gray-500
  let defaultHandleColor;
  switch (fromType) {
    case 'text':
      defaultHandleColor = 'var(--color-connection-text)';
      break;
    case 'image':
      defaultHandleColor = 'var(--color-connection-image)';
      break;
    case 'character_data':
      defaultHandleColor = 'var(--color-connection-character)';
      break;
    case 'video':
      defaultHandleColor = 'var(--color-connection-video)';
      break;
    case 'audio':
      defaultHandleColor = 'var(--color-connection-audio)';
      break;
    default:
      defaultHandleColor = defaultColor;
  }

  // Calculate effective animated flow color based on colorMode
  const activeFlowColor = getEffectiveConnectionColor(
    animConfig.colorMode,
    defaultHandleColor,
    'var(--color-text-accent, #00f0ff)'
  );

  const isCutterActive = activeTool === 'cutter';
  const isRerouteActive = activeTool === 'reroute';
  const isSelectionActive = activeTool === 'selection';
  const isHighlighted = (isCutterActive || isRerouteActive) && (isLineHovered || isNodeHovered);

  // If highlighted or selected, use corresponding color
  const strokeColor = isCutterActive && isHighlighted 
    ? '#ef4444' 
    : (isRerouteActive && isHighlighted 
        ? '#06b6d4' 
        : (isSelectionActive && isLineHovered ? 'var(--color-accent, #6366f1)' : defaultHandleColor));
  
  // Opacity & stroke width
  const baseOpacity = (isHighlighted || (isSelectionActive && isLineHovered)) ? 1 : connectionOpacity;
  const strokeWidth = (isHighlighted || (isSelectionActive && isLineHovered)) ? 5 : 3;
  
  const currentCursorSet = getActiveCursorDefinition(cursorSkin || 'default', currentTheme || 'cyan');
  let cursorStyle = 'default';
  if (isCutterActive) {
    cursorStyle = currentCursorSet.cursors.cutter;
  } else if (isRerouteActive) {
    cursorStyle = currentCursorSet.cursors.reroute;
  } else if (isSelectionActive) {
    cursorStyle = currentCursorSet.cursors.crosshair;
  } else {
    cursorStyle = isLineHovered ? currentCursorSet.cursors.pointer : currentCursorSet.cursors.default;
  }

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); // Prevent canvas mousedown from firing
    if (isCutterActive) {
      onDelete(connection.id);
    } else if (isRerouteActive) {
      onSplit(connection.id);
    } else if (isSelectionActive && context?.setSelectedNodeIds) {
      context.setSelectedNodeIds([fromNode.id, toNode.id]);
    }
  };

  const toolClass = isCutterActive ? 'tool-cutter-active' : (isRerouteActive ? 'tool-reroute-active' : '');

  // Calculate timing & animation variables
  const speedMultiplier = Math.max(0.2, animConfig.speed || 1.0);
  const durationSec = (2.6 / speedMultiplier).toFixed(2);
  const isReverse = animConfig.flowDirection === 'reverse';
  const animDirectionClass = isReverse ? 'flow-move-rev' : 'flow-move-fwd';
  const trailLen = Math.max(15, animConfig.trailLength || 70);
  const particleSz = Math.max(2, animConfig.particleSize || 4.5);
  const density = Math.max(1, animConfig.frequency || 2);
  const glowAlpha = Math.max(0.1, Math.min(1.0, animConfig.glowIntensity ?? 0.8));

  // The base repeating period: exact sum of trailLen + gapLen so stroke-dashoffset animation loops with ZERO hitch
  const gapLen = Math.max(40, Math.round(280 / density));
  const period = trailLen + gapLen;

  // Stream-specific period for high-frequency particle packets
  const streamGap = Math.max(10, Math.round(50 / density));
  const streamPeriod = particleSz + streamGap;

  // Classic period
  const classicDash = 8;
  const classicGap = 48;
  const classicPeriod = classicDash + classicGap;

  return (
    <g 
      className={`connection-view ${toolClass}`}
      data-tool={activeTool}
      data-highlighted={isHighlighted ? "true" : undefined}
      onMouseEnter={() => setIsLineHovered(true)}
      onMouseLeave={() => setIsLineHovered(false)}
      onMouseDown={handleClick}
      onTouchStart={handleClick}
      style={{ 
        cursor: cursorStyle, 
        pointerEvents: 'auto',
        ['--conn-period' as any]: `${period}px`,
        ['--conn-speed' as any]: `${durationSec}s`,
        ['--conn-glow-color' as any]: activeFlowColor,
      }}
    >
      {/* SVG Filter and Gradients for Trail and Glow Effects */}
      <defs>
        <filter id={`conn-glow-${uniqueFilterId}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={3 * glowAlpha} result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        {animStyle === 'neon_flow' && (
          <linearGradient 
            id={`conn-neon-grad-${uniqueFilterId}`} 
            x1={isReverse ? "100%" : "0%"} 
            y1="0%" 
            x2={isReverse ? "0%" : "100%"} 
            y2="0%"
            gradientUnits="userSpaceOnUse"
          >
            {getNeonFlowGradientStops(animConfig.colorMode, activeFlowColor).map((col, idx, arr) => {
              const offsetPct = `${Math.round((idx / (arr.length - 1)) * 100)}%`;
              const cycleValues = arr.slice(idx).concat(arr.slice(0, idx)).concat(arr[idx]).join('; ');
              return (
                <stop key={idx} offset={offsetPct} stopColor={col}>
                  <animate
                    attributeName="stop-color"
                    values={cycleValues}
                    dur={`${(3.2 / speedMultiplier).toFixed(2)}s`}
                    repeatCount="indefinite"
                  />
                </stop>
              );
            })}
          </linearGradient>
        )}
      </defs>

      {/* Hit area (Invisible, wider for easier selection) */}
      <path
        d={pathData}
        stroke="transparent"
        strokeWidth="22"
        fill="none"
        style={{ pointerEvents: 'stroke' }}
      />
      
      {/* Base Visible Line (Dimmed to act as track) */}
      <path
        d={pathData}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill="none"
        style={{ 
            pointerEvents: 'none', 
            opacity: baseOpacity,
            transition: 'stroke 0.2s ease-in-out, stroke-width 0.2s ease-in-out, opacity 0.2s ease-in-out' 
        }} 
      />

      {/* DYNAMIC ANIMATION LAYERS */}
      {isConnectionAnimationEnabled && (
        <g style={{ pointerEvents: 'none' }}>
          {/* 1. CYBER TRON: Leading Photon Head + 8-10 Smooth Gradations Tail */}
          {animStyle === 'cyber_tron' && (
            <>
              {/* 9 Gradations of smooth fading trail behind photon */}
              {CYBER_TRON_GRADATIONS.map((grad, idx) => {
                const segLen = Math.max(3, Math.round(trailLen * grad.lenFrac));
                const segGap = period - segLen;
                const segDelay = isReverse
                  ? '0s'
                  : `${-(((trailLen - segLen) / period) * parseFloat(durationSec)).toFixed(3)}s`;
                const isAuraLayer = idx < 2;

                return (
                  <path
                    key={idx}
                    d={pathData}
                    stroke={activeFlowColor}
                    strokeWidth={Math.max(1.2, particleSz * grad.widthMul)}
                    fill="none"
                    style={{
                      strokeDasharray: `${segLen} ${segGap}`,
                      animation: `${animDirectionClass} ${durationSec}s linear ${segDelay} infinite`,
                      opacity: grad.opacityMul * glowAlpha,
                      filter: isAuraLayer ? `url(#conn-glow-${uniqueFilterId})` : undefined,
                      strokeLinecap: 'round',
                    }}
                  />
                );
              })}

              {/* Leading High-Energy Photon Head (10th stage, pure white at the very front) */}
              <path
                d={pathData}
                stroke="#ffffff"
                strokeWidth={particleSz * 1.35}
                fill="none"
                className="conn-anim-cyber-tron-head"
                style={{
                  strokeDasharray: `${particleSz} ${period - particleSz}`,
                  animation: `${animDirectionClass} ${durationSec}s linear ${
                    isReverse
                      ? '0s'
                      : `${-(((trailLen - particleSz) / period) * parseFloat(durationSec)).toFixed(3)}s`
                  } infinite`,
                  opacity: 1,
                  filter: `drop-shadow(0 0 ${4 * glowAlpha}px #ffffff) drop-shadow(0 0 ${10 * glowAlpha}px ${activeFlowColor})`,
                  strokeLinecap: 'round',
                }}
              />
            </>
          )}

          {/* 2. NEON FLOW: Continuous Glowing Line with Smooth Shifting Gradient */}
          {animStyle === 'neon_flow' && (
            <>
              {/* Broad Neon Aura Bloom */}
              <path
                d={pathData}
                stroke={`url(#conn-neon-grad-${uniqueFilterId})`}
                strokeWidth={particleSz * 2.2}
                fill="none"
                className="conn-anim-neon-aura"
                style={{
                  opacity: 0.65 * glowAlpha,
                  filter: `url(#conn-glow-${uniqueFilterId})`,
                  animation: `conn-neon-aura-breath ${(parseFloat(durationSec) * 0.9).toFixed(2)}s ease-in-out infinite`,
                  strokeLinecap: 'round',
                }}
              />
              {/* Core Radiant Neon Tube */}
              <path
                d={pathData}
                stroke={`url(#conn-neon-grad-${uniqueFilterId})`}
                strokeWidth={Math.max(2, particleSz * 0.95)}
                fill="none"
                style={{
                  opacity: 0.95,
                  filter: `drop-shadow(0 0 ${4 * glowAlpha}px ${activeFlowColor})`,
                  strokeLinecap: 'round',
                }}
              />
              {/* Center Bright Filament */}
              <path
                d={pathData}
                stroke="#ffffff"
                strokeWidth={Math.max(1, particleSz * 0.3)}
                fill="none"
                style={{
                  opacity: 0.8,
                  strokeLinecap: 'round',
                }}
              />
            </>
          )}

          {/* 3. PULSE: Whole-Line Synchronous Breathing & Glow Surge */}
          {animStyle === 'pulse' && (
            <>
              {/* Broad Whole-Line Pulsing Glow Aura */}
              <path
                d={pathData}
                stroke={activeFlowColor}
                strokeWidth={particleSz * 2.4}
                fill="none"
                className="conn-anim-pulse-aura"
                style={{
                  animation: `conn-whole-line-pulse ${(parseFloat(durationSec) * 0.85).toFixed(2)}s ease-in-out infinite`,
                  opacity: 0.75 * glowAlpha,
                  filter: `url(#conn-glow-${uniqueFilterId})`,
                  strokeLinecap: 'round',
                }}
              />
              {/* Mid Harmonic Core Wave */}
              <path
                d={pathData}
                stroke={activeFlowColor}
                strokeWidth={Math.max(2, particleSz * 1.15)}
                fill="none"
                style={{
                  animation: `conn-whole-line-pulse ${(parseFloat(durationSec) * 0.85).toFixed(2)}s ease-in-out infinite`,
                  opacity: 0.9,
                  strokeLinecap: 'round',
                }}
              />
              {/* Center Pulsing White Core */}
              <path
                d={pathData}
                stroke="#ffffff"
                strokeWidth={Math.max(1.2, particleSz * 0.4)}
                fill="none"
                style={{
                  animation: `conn-pulse-core ${(parseFloat(durationSec) * 0.85).toFixed(2)}s ease-in-out infinite`,
                  opacity: 0.9,
                  strokeLinecap: 'round',
                }}
              />
            </>
          )}

          {/* 4. SHIMMER: Continuous Luminescent Glitter & Starlight Sparkle */}
          {animStyle === 'shimmer' && (
            <>
              {/* Outer High-Frequency Shimmering Aura */}
              <path
                d={pathData}
                stroke={activeFlowColor}
                strokeWidth={particleSz * 1.8}
                fill="none"
                className="conn-anim-shimmer"
                style={{
                  animation: `conn-whole-line-shimmer ${(parseFloat(durationSec) * 0.7).toFixed(2)}s ease-in-out infinite`,
                  opacity: 0.9 * glowAlpha,
                  filter: `url(#conn-glow-${uniqueFilterId})`,
                  strokeLinecap: 'round',
                }}
              />
              {/* Inner Sparkle Filament */}
              <path
                d={pathData}
                stroke="#ffffff"
                strokeWidth={Math.max(1.2, particleSz * 0.5)}
                fill="none"
                style={{
                  animation: `conn-shimmer-core ${(parseFloat(durationSec) * 0.5).toFixed(2)}s ease-in-out infinite`,
                  opacity: 0.95,
                  strokeLinecap: 'round',
                }}
              />
            </>
          )}

          {/* 5. PARTICLE STREAM: High-Density Energetic Photons */}
          {animStyle === 'particle_stream' && (
            <path
              d={pathData}
              stroke={activeFlowColor}
              strokeWidth={particleSz}
              fill="none"
              className="conn-anim-particle-stream"
              style={{
                ['--conn-period' as any]: `${streamPeriod}px`,
                strokeDasharray: `${particleSz} ${streamGap}`,
                animation: `${animDirectionClass} ${(parseFloat(durationSec) * 0.65).toFixed(2)}s linear infinite`,
                opacity: 0.95 * glowAlpha,
                strokeLinecap: 'round',
                filter: `drop-shadow(0 0 ${4 * glowAlpha}px ${activeFlowColor})`,
              }}
            />
          )}

          {/* 6. ENERGY BEAM: High-Voltage Surge Core */}
          {animStyle === 'energy_beam' && (
            <>
              <path
                d={pathData}
                stroke={activeFlowColor}
                strokeWidth={particleSz * 1.4}
                fill="none"
                className="conn-anim-energy-beam"
                style={{
                  strokeDasharray: `${trailLen} ${gapLen}`,
                  animation: `${animDirectionClass} ${(parseFloat(durationSec) * 0.55).toFixed(2)}s linear infinite, conn-beam-surge 1.4s ease-in-out infinite`,
                  opacity: 0.85 * glowAlpha,
                  strokeLinecap: 'round',
                  filter: `drop-shadow(0 0 ${8 * glowAlpha}px ${activeFlowColor})`,
                }}
              />
              <path
                d={pathData}
                stroke="#ffffff"
                strokeWidth={Math.max(1.5, particleSz * 0.5)}
                fill="none"
                style={{
                  strokeDasharray: `${trailLen * 0.65} ${gapLen + trailLen * 0.35}`,
                  animation: `${animDirectionClass} ${(parseFloat(durationSec) * 0.55).toFixed(2)}s linear ${
                    isReverse ? '0s' : `${-(((trailLen * 0.35) / period) * (parseFloat(durationSec) * 0.55)).toFixed(3)}s`
                  } infinite`,
                  opacity: 1,
                  strokeLinecap: 'round',
                }}
              />
            </>
          )}

          {/* 7. CLASSIC: Smooth Linear Dash */}
          {animStyle === 'classic' && (
            <path
              d={pathData}
              stroke={activeFlowColor}
              strokeWidth={3}
              fill="none"
              className="conn-anim-classic"
              style={{
                ['--conn-period' as any]: `${classicPeriod}px`,
                strokeDasharray: `${classicDash} ${classicGap}`,
                animation: `${animDirectionClass} ${durationSec}s linear infinite`,
                opacity: 0.85,
                strokeLinecap: 'round',
                filter: `drop-shadow(0 0 ${2 * glowAlpha}px rgba(255,255,255,0.4))`,
              }}
            />
          )}
        </g>
      )}
    </g>
  );
};

export default React.memo(ConnectionView);

