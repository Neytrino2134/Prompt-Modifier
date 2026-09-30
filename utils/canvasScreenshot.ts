import { CanvasState, NodeType } from '../types';

/**
 * Generates a clean, high-fidelity visual screenshot preview of a CanvasState.
 * Can run synchronously in any environment (Web or Electron) without DOM dependencies.
 */
export function generateCanvasScreenshot(state?: CanvasState, width = 640, height = 360): string {
  if (typeof document === 'undefined') return '';

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // 1. Dark canvas background
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, width, height);

    // 2. Subtle grid background
    ctx.fillStyle = 'rgba(148, 163, 184, 0.07)';
    const gridSize = 20;
    for (let x = 0; x < width; x += gridSize) {
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const nodes = state?.nodes || [];
    const connections = state?.connections || [];
    const groups = state?.groups || [];

    if (nodes.length === 0) {
      // Empty canvas placeholder
      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Empty Canvas', width / 2, height / 2);
      return canvas.toDataURL('image/jpeg', 0.85);
    }

    // 3. Compute bounding box of all nodes
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of nodes) {
      const nx = node.position?.x ?? 0;
      const ny = node.position?.y ?? 0;
      const nw = node.width || 360;
      const nh = node.height || 260;

      if (nx < minX) minX = nx;
      if (ny < minY) minY = ny;
      if (nx + nw > maxX) maxX = nx + nw;
      if (ny + nh > maxY) maxY = ny + nh;
    }

    // Add margin
    const margin = 80;
    minX -= margin;
    minY -= margin;
    maxX += margin;
    maxY += margin;

    const contentWidth = Math.max(100, maxX - minX);
    const contentHeight = Math.max(100, maxY - minY);

    // Calculate scale to fit content into canvas (maintaining aspect ratio)
    const scaleX = width / contentWidth;
    const scaleY = height / contentHeight;
    const scale = Math.min(scaleX, scaleY, 1.2); // Cap zoom if few nodes

    const offsetX = (width - contentWidth * scale) / 2 - minX * scale;
    const offsetY = (height - contentHeight * scale) / 2 - minY * scale;

    const toScreenX = (x: number) => x * scale + offsetX;
    const toScreenY = (y: number) => y * scale + offsetY;

    // 4. Draw Groups
    for (const group of groups) {
      const gx = toScreenX(group.position?.x ?? 0);
      const gy = toScreenY(group.position?.y ?? 0);
      const gw = (group.width || 400) * scale;
      const gh = (group.height || 300) * scale;

      const groupColor = (group as any).color;
      ctx.fillStyle = groupColor ? `${groupColor}15` : 'rgba(56, 189, 248, 0.08)';
      ctx.strokeStyle = groupColor ? `${groupColor}40` : 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = Math.max(1, 1.5 * scale);
      
      roundRect(ctx, gx, gy, gw, gh, 8 * scale);
      ctx.fill();
      ctx.stroke();

      if (group.title) {
        ctx.fillStyle = 'rgba(226, 232, 240, 0.8)';
        ctx.font = `bold ${Math.max(9, 12 * scale)}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(group.title, gx + 8 * scale, gy + 6 * scale);
      }
    }

    // 5. Draw Connections
    const nodeMap = new Map<string, { x: number; y: number; w: number; h: number }>();
    for (const node of nodes) {
      nodeMap.set(node.id, {
        x: node.position?.x ?? 0,
        y: node.position?.y ?? 0,
        w: node.width || 360,
        h: node.height || 260,
      });
    }

    for (const conn of connections) {
      const from = nodeMap.get(conn.fromNodeId);
      const to = nodeMap.get(conn.toNodeId);
      if (!from || !to) continue;

      const fromX = toScreenX(from.x + from.w);
      const fromY = toScreenY(from.y + 40);
      const toX = toScreenX(to.x);
      const toY = toScreenY(to.y + 40);

      const dx = Math.abs(toX - fromX) * 0.5;

      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.bezierCurveTo(fromX + dx, fromY, toX - dx, toY, toX, toY);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)'; // cyan
      ctx.lineWidth = Math.max(1.2, 2.5 * scale);
      ctx.stroke();
    }

    // 6. Draw Nodes
    for (const node of nodes) {
      const nx = toScreenX(node.position?.x ?? 0);
      const ny = toScreenY(node.position?.y ?? 0);
      const nw = (node.width || 360) * scale;
      const nh = (node.height || 260) * scale;

      const nodeColor = getNodeHeaderColor(node.type);

      // Node shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 8 * scale;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 3 * scale;

      // Node background
      ctx.fillStyle = '#1e293b'; // slate-800
      roundRect(ctx, nx, ny, nw, nh, 8 * scale);
      ctx.fill();

      ctx.shadowColor = 'transparent';

      // Node border
      ctx.strokeStyle = `${nodeColor}90`;
      ctx.lineWidth = Math.max(1, 1.8 * scale);
      ctx.stroke();

      // Node Header
      const headerHeight = Math.min(32 * scale, nh * 0.25);
      ctx.fillStyle = '#0f172a';
      roundRect(ctx, nx, ny, nw, headerHeight, { tl: 8 * scale, tr: 8 * scale, bl: 0, br: 0 });
      ctx.fill();

      // Node header accent bar
      ctx.fillStyle = nodeColor;
      roundRect(ctx, nx + 4 * scale, ny + 4 * scale, 3 * scale, headerHeight - 8 * scale, 2 * scale);
      ctx.fill();

      // Node Title
      ctx.fillStyle = '#f8fafc';
      const fontSize = Math.max(8, Math.min(12, 11 * scale));
      ctx.font = `600 ${fontSize}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const title = node.title || node.type || 'Node';
      const maxTitleWidth = nw - 24 * scale;
      ctx.fillText(truncateText(ctx, title, maxTitleWidth), nx + 12 * scale, ny + headerHeight / 2);

      // Inner body preview
      const bodyY = ny + headerHeight + 4 * scale;
      const bodyHeight = nh - headerHeight - 8 * scale;

      if (node.type === NodeType.IMAGE_OUTPUT || node.type === NodeType.IMAGE_EDITOR || node.type === NodeType.THREE_D_GENERATOR) {
        // Draw image frame placeholder / preview
        ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
        roundRect(ctx, nx + 6 * scale, bodyY, nw - 12 * scale, bodyHeight, 4 * scale);
        ctx.fill();

        ctx.fillStyle = `${nodeColor}50`;
        ctx.font = `${Math.max(7, 9 * scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🖼️ Image', nx + nw / 2, bodyY + bodyHeight / 2);
      } else {
        // Draw simulated text lines
        const lineCount = Math.min(4, Math.max(2, Math.floor(bodyHeight / (10 * scale))));
        for (let i = 0; i < lineCount; i++) {
          const lw = (nw - 16 * scale) * (0.6 + (i % 3) * 0.15);
          ctx.fillStyle = i === 0 ? 'rgba(148, 163, 184, 0.4)' : 'rgba(100, 116, 139, 0.3)';
          roundRect(ctx, nx + 8 * scale, bodyY + i * 9 * scale + 3 * scale, lw, 4 * scale, 2 * scale);
          ctx.fill();
        }
      }
    }

    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (err) {
    console.warn('Canvas preview screenshot generation error:', err);
    return '';
  }
}

function getNodeHeaderColor(type: NodeType | string): string {
  switch (type) {
    case NodeType.TEXT_INPUT: return '#06b6d4'; // cyan
    case NodeType.PROMPT_PROCESSOR: return '#3b82f6'; // blue
    case NodeType.IMAGE_OUTPUT: return '#8b5cf6'; // purple
    case NodeType.IMAGE_EDITOR: return '#ec4899'; // pink
    case NodeType.GEMINI_CHAT: return '#10b981'; // emerald
    case NodeType.TRANSLATOR: return '#f59e0b'; // amber
    case NodeType.VIDEO_OUTPUT: return '#ef4444'; // red
    case NodeType.THREE_D_GENERATOR: return '#14b8a6'; // teal
    default: return '#64748b'; // slate
  }
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | { tl: number; tr: number; bl: number; br: number }
) {
  if (width < 0 || height < 0) return;
  const r = typeof radius === 'number'
    ? { tl: radius, tr: radius, br: radius, bl: radius }
    : radius;

  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + width - r.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r.tr);
  ctx.lineTo(x + width, y + height - r.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r.br, y + height);
  ctx.lineTo(x + r.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
}
