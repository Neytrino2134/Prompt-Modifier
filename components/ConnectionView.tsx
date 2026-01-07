
import React, { useState } from 'react';
import type { Point, Connection, Tool, Node, LineStyle } from '../types';
import { NodeType } from '../types';
import { getOutputHandleType, COLLAPSED_NODE_HEIGHT } from '../utils/nodeUtils';
import { useAppContext } from '../contexts/AppContext';

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
  const { isConnectionAnimationEnabled, connectionOpacity } = useAppContext() || { isConnectionAnimationEnabled: true, connectionOpacity: 0.4 };
  const [isLineHovered, setIsLineHovered] = useState(false);

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
  let lineColor;
  switch (fromType) {
    case 'text':
      lineColor = 'var(--color-connection-text)';
      break;
    case 'image':
      lineColor = 'var(--color-connection-image)';
      break;
    case 'character_data':
      lineColor = 'var(--color-connection-character)';
      break;
    case 'video':
      lineColor = 'var(--color-connection-video)';
      break;
    case 'audio':
      lineColor = 'var(--color-connection-audio)';
      break;
    default:
      lineColor = defaultColor;
  }


  const isCutterActive = activeTool === 'cutter';
  const isRerouteActive = activeTool === 'reroute';
  const isHighlighted = (isCutterActive || isRerouteActive) && (isLineHovered || isNodeHovered);

  // If highlighted, use the highlight color. Otherwise use the type-based color.
  const strokeColor = isCutterActive && isHighlighted ? '#ef4444' : (isRerouteActive && isHighlighted ? '#06b6d4' : lineColor);
  
  // Dim the base line if it's a normal connection so the dashed flow is visible on top.
  // If highlighted, keep full opacity.
  const baseOpacity = isHighlighted ? 1 : connectionOpacity;
  
  const strokeWidth = isHighlighted ? 5 : 3;
  
  let cursorStyle = 'default';
  if (isCutterActive && (isLineHovered || isNodeHovered)) {
    cursorStyle = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="%23ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg>') 12 12, auto`;
  } else if (isRerouteActive && isLineHovered) {
    cursorStyle = 'crosshair';
  } else if (isCutterActive || isRerouteActive) {
    cursorStyle = 'pointer';
  }


  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); // Prevent canvas mousedown from firing
    if (isCutterActive) {
      onDelete(connection.id);
    } else if (isRerouteActive) {
      onSplit(connection.id);
    }
  };

  return (
    <g 
      className="connection-view"
      onMouseEnter={() => setIsLineHovered(true)}
      onMouseLeave={() => setIsLineHovered(false)}
      onMouseDown={handleClick}
      onTouchStart={handleClick}
      style={{ cursor: cursorStyle, pointerEvents: 'auto' }}
    >
      {/* Hit area (Invisible, wider for easier selection) */}
      <path
        d={pathData}
        stroke="transparent"
        strokeWidth="20"
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

      {/* Data Flow Animation Layer (Bright Dashes in Type Color) */}
      {isConnectionAnimationEnabled && (
          <path
            d={pathData}
            stroke={lineColor}
            strokeWidth={3}
            fill="none"
            className="connection-flow"
            style={{ pointerEvents: 'none', opacity: 1 }}
          />
      )}
    </g>
  );
};

export default React.memo(ConnectionView);
