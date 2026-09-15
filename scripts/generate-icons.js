import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const svgPath = path.join(rootDir, 'public/favicon.svg');
const svgContent = fs.readFileSync(svgPath, 'utf-8');

function renderSvg(svg, size) {
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: size,
    },
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

// Ensure target directories exist
fs.mkdirSync(path.join(rootDir, 'resources'), { recursive: true });
fs.mkdirSync(path.join(rootDir, 'public'), { recursive: true });

// 1. 512x512 for main app icon
const png512 = renderSvg(svgContent, 512);
fs.writeFileSync(path.join(rootDir, 'resources/icon.png'), png512);
fs.writeFileSync(path.join(rootDir, 'public/icon.png'), png512);

// 2. Windows ICO container with PNG images at multiple resolutions.
// rcedit requires an ICO header; a PNG renamed to .ico is not valid.
const iconSizes = [16, 32, 48, 64, 128, 256];
const iconImages = iconSizes.map(size => renderSvg(svgContent, size));
const iconHeader = Buffer.alloc(6 + iconSizes.length * 16);
iconHeader.writeUInt16LE(1, 2); // Image type: icon
iconHeader.writeUInt16LE(iconSizes.length, 4);
let imageOffset = iconHeader.length;
iconImages.forEach((png, index) => {
  const size = iconSizes[index];
  if (png.readUInt32BE(16) !== size || png.readUInt32BE(20) !== size) {
    throw new Error(`Windows icon must be square (${size}x${size}). Check public/favicon.svg.`);
  }
  const entryOffset = 6 + index * 16;
  iconHeader[entryOffset] = size === 256 ? 0 : size;
  iconHeader[entryOffset + 1] = size === 256 ? 0 : size;
  iconHeader.writeUInt16LE(1, entryOffset + 4); // Color planes
  iconHeader.writeUInt16LE(32, entryOffset + 6); // Bits per pixel
  iconHeader.writeUInt32LE(png.length, entryOffset + 8);
  iconHeader.writeUInt32LE(imageOffset, entryOffset + 12);
  imageOffset += png.length;
});
fs.writeFileSync(path.join(rootDir, 'resources/icon.ico'), Buffer.concat([iconHeader, ...iconImages]));

// 3. 64x64 favicon
const png64 = renderSvg(svgContent, 64);
fs.writeFileSync(path.join(rootDir, 'public/favicon.png'), png64);

// 4. 32x32 tray icon (for high DPI / Windows tray)
const png32 = renderSvg(svgContent, 32);
fs.writeFileSync(path.join(rootDir, 'public/tray-icon.png'), png32);
fs.writeFileSync(path.join(rootDir, 'resources/tray-icon.png'), png32);

// 5. 16x16 tray icon (for standard DPI)
const png16 = renderSvg(svgContent, 16);
fs.writeFileSync(path.join(rootDir, 'public/tray-icon-16.png'), png16);
fs.writeFileSync(path.join(rootDir, 'resources/tray-icon-16.png'), png16);

// Also generate base64 data URL for embedded fallback in main.js
const base64DataUrl = `data:image/png;base64,${png32.toString('base64')}`;
fs.writeFileSync(path.join(rootDir, 'electron/tray_icon_base64.js'), `export const TRAY_ICON_DATA_URL = ${JSON.stringify(base64DataUrl)};\n`);

console.log('Icons generated successfully! Sizes: 512x512, 256x256, 64x64, 32x32, 16x16');
