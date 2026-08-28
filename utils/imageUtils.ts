export const convertToPNG = async (dataUrl: string): Promise<string> => {
    if (dataUrl.startsWith('data:image/png')) {
        return dataUrl;
    }
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error('Failed to load image for PNG conversion'));
        img.src = dataUrl;
    });
};

export const formatImageForAspectRatio = async (
    base64Image: string,
    targetAspectRatioString: string
): Promise<{ formattedImage: string, needsFormatting: boolean }> => {
    return new Promise((resolve, reject) => {
        if (!base64Image) {
            return reject(new Error('Source image is empty.'));
        }

        const img = new Image();
        img.onload = () => {
            const sourceRatio = img.width / img.height;
            const [targetW, targetH] = targetAspectRatioString.split(':').map(Number);
            const targetRatio = targetW / targetH;

            if (Math.abs(sourceRatio - targetRatio) < 0.01) {
                return resolve({ formattedImage: base64Image, needsFormatting: false });
            }

            let canvasWidth: number, canvasHeight: number;
            let drawX: number, drawY: number;

            if (sourceRatio > targetRatio) { // Source is wider than target
                canvasWidth = img.width;
                canvasHeight = img.width / targetRatio;
                drawX = 0;
                drawY = (canvasHeight - img.height) / 2;
            } else { // Source is taller than target or square
                canvasHeight = img.height;
                canvasWidth = img.height * targetRatio;
                drawX = (canvasWidth - img.width) / 2;
                drawY = 0;
            }

            const canvas = document.createElement('canvas');
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }

            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, drawX, drawY, img.width, img.height);

            resolve({ formattedImage: canvas.toDataURL('image/png'), needsFormatting: true });
        };
        img.onerror = () => {
            console.error("Failed to load image for formatting. The provided image source might be invalid or corrupted.");
            reject(new Error('Failed to load the provided image. It might be corrupted or in an unsupported format.'));
        };
        img.src = base64Image;
    });
};

export const cropImageTo169 = (base64Image: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!base64Image) {
            return reject(new Error('Source image is empty for cropping.'));
        }

        const img = new Image();
        img.onload = () => {
            const targetRatio = 16 / 9;
            const currentRatio = img.width / img.height;

            // SMART CHECK:
            // If the image is not in landscape (ratio < 1.2), don't crop it to 16:9.
            // This prevents unintended cropping of square (1:1) or vertical (9:16) images.
            if (currentRatio < 1.2) {
                return resolve(base64Image);
            }

            // If it's already very close to 16:9, just return as is to save processing
            if (Math.abs(currentRatio - targetRatio) < 0.02) {
                return resolve(base64Image);
            }

            let targetWidth, targetHeight;
            let xOffset = 0, yOffset = 0;

            if (currentRatio > targetRatio) {
                // Image is wider than 16:9 -> Crop sides
                targetHeight = img.height;
                targetWidth = img.height * targetRatio;
                xOffset = (img.width - targetWidth) / 2;
            } else {
                // Image is narrower than 16:9 but still landscape -> Crop top/bottom
                targetWidth = img.width;
                targetHeight = img.width / targetRatio;
                yOffset = (img.height - targetHeight) / 2;
            }

            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                return reject(new Error('Could not get canvas context for cropping.'));
            }

            ctx.drawImage(
                img,
                xOffset, yOffset, targetWidth, targetHeight,
                0, 0, targetWidth, targetHeight
            );

            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
            reject(new Error('Failed to load the provided image for cropping.'));
        };
        img.src = base64Image;
    });
};

export const cropImageTo1x1 = (base64Image: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!base64Image) {
            return reject(new Error('Source image is empty for cropping.'));
        }

        const img = new Image();
        img.onload = () => {
            const size = Math.min(img.width, img.height);
            const xOffset = (img.width - size) / 2;
            const yOffset = (img.height - size) / 2;

            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                return reject(new Error('Could not get canvas context for cropping.'));
            }

            ctx.drawImage(
                img,
                xOffset, yOffset, size, size,
                0, 0, size, size
            );

            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
            reject(new Error('Failed to load the provided image for cropping.'));
        };
        img.src = base64Image;
    });
};

export const generateThumbnail = async (
    base64Image: string,
    maxWidth: number,
    maxHeight: number
): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!base64Image) {
            return reject(new Error('Source image is empty.'));
        }
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }

            let { width, height } = img;
            const ratio = width / height;
            
            if (width > maxWidth) {
                width = maxWidth;
                height = width / ratio;
            }
            if (height > maxHeight) {
                height = maxHeight;
                width = height * ratio;
            }
            
            canvas.width = width;
            canvas.height = height;

            ctx.drawImage(img, 0, 0, width, height);
            
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = (err) => {
            console.error("Failed to load image for thumbnail generation:", err);
            reject(new Error('Failed to load the provided image for thumbnailing.'));
        };
        img.src = base64Image;
    });
};

export const getModelDisplayName = (model?: string): string => {
    if (!model) return 'Imagen 4.0';
    const cleanModel = model.trim();
    const map: Record<string, string> = {
        'imagen-4.0-generate-001': 'Imagen 4.0',
        'imagen-4.0-ultra-generate-preview-06-06': 'Imagen 4.0 Ultra',
        'imagen-3.0-generate-002': 'Imagen 3.0',
        'imagen-3.0-generate-001': 'Imagen 3.0',
        'imagen-3.0-capability-001': 'Imagen 3.0',
        'imagen-4.0-upscale-preview': 'Imagen 4.0 Upscale',
        'gemini-3-pro-image-preview': 'Gemini 3.0 Pro Image',
        'gemini-3.1-flash-image': 'Gemini 3.1 Flash Image',
        'gemini-3.1-flash-image-preview': 'Gemini 3.1 Flash Image Preview',
        'gemini-2.5-flash-image': 'Gemini 2.5 Flash Image',
    };
    if (map[cleanModel]) return map[cleanModel];
    if (cleanModel.startsWith('imagen-4.0')) return 'Imagen 4.0';
    if (cleanModel.startsWith('imagen-3.0')) return 'Imagen 3.0';
    return cleanModel;
};

export const getAspectRatioFromDimensions = (w: number, h: number): string | null => {
    if (!w || !h) return null;
    const actualRatio = w / h;
    const standardRatios: [number, string][] = [
        [1, '1:1'],
        [16 / 9, '16:9'],
        [9 / 16, '9:16'],
        [4 / 3, '4:3'],
        [3 / 4, '3:4'],
        [3 / 2, '3:2'],
        [2 / 3, '2:3'],
        [21 / 9, '21:9'],
        [4 / 1, '4:1'],
        [1 / 4, '1:4'],
        [8 / 1, '8:1'],
        [1 / 8, '1:8']
    ];
    for (const [r, name] of standardRatios) {
        if (Math.abs(actualRatio - r) < 0.04) {
            return name;
        }
    }
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(Math.round(w), Math.round(h));
    if (divisor > 0) {
        const ratioW = Math.round(w / divisor);
        const ratioH = Math.round(h / divisor);
        if (ratioW <= 32 && ratioH <= 32) {
            return `${ratioW}:${ratioH}`;
        }
    }
    return null;
};

export const cropImageNormalized = (
    base64Image: string,
    rect: { x: number; y: number; width: number; height: number }
): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!base64Image) {
            return reject(new Error('Source image is empty for cropping.'));
        }

        const img = new Image();
        img.onload = () => {
            const naturalW = img.naturalWidth || img.width;
            const naturalH = img.naturalHeight || img.height;

            // Clamp and sanitize coordinates
            const clampedX = Math.max(0, Math.min(1, rect.x));
            const clampedY = Math.max(0, Math.min(1, rect.y));
            const clampedW = Math.max(0.01, Math.min(1 - clampedX, rect.width));
            const clampedH = Math.max(0.01, Math.min(1 - clampedY, rect.height));

            const sx = Math.round(clampedX * naturalW);
            const sy = Math.round(clampedY * naturalH);
            const sw = Math.round(clampedW * naturalW);
            const sh = Math.round(clampedH * naturalH);

            if (sw <= 0 || sh <= 0) {
                return resolve(base64Image);
            }

            const canvas = document.createElement('canvas');
            canvas.width = sw;
            canvas.height = sh;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                return reject(new Error('Could not get canvas context for cropping.'));
            }

            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
            reject(new Error('Failed to load image for cropping.'));
        };
        img.src = base64Image;
    });
};

export const sliceImageGrid = (
    base64Image: string,
    cols: number,
    rows: number,
    bounds: { x: number; y: number; width: number; height: number } = { x: 0, y: 0, width: 1, height: 1 },
    borderConfig?: { enableBorder?: boolean; borderWidth?: number; borderMode?: 'inner' | 'all' }
): Promise<{ slices: string[]; thumbs: string[] }> => {
    return new Promise((resolve, reject) => {
        if (!base64Image) {
            return reject(new Error('Source image is empty for grid slicing.'));
        }

        const safeCols = Math.max(1, Math.min(50, Math.round(cols)));
        const safeRows = Math.max(1, Math.min(50, Math.round(rows)));

        const img = new Image();
        img.onload = async () => {
            try {
                const naturalW = img.naturalWidth || img.width;
                const naturalH = img.naturalHeight || img.height;

                const gridX = Math.max(0, Math.min(1, bounds.x)) * naturalW;
                const gridY = Math.max(0, Math.min(1, bounds.y)) * naturalH;
                const gridW = Math.max(0.01, Math.min(1 - bounds.x, bounds.width)) * naturalW;
                const gridH = Math.max(0.01, Math.min(1 - bounds.y, bounds.height)) * naturalH;

                const enableBorder = Boolean(borderConfig?.enableBorder);
                const rawBw = enableBorder ? Math.max(0, Number(borderConfig?.borderWidth) || 0) : 0;
                const borderMode = borderConfig?.borderMode || 'inner';

                let cellW: number;
                let cellH: number;
                let bwX = 0;
                let bwY = 0;
                let offsetX = 0;
                let offsetY = 0;

                if (rawBw > 0) {
                    if (borderMode === 'all') {
                        // Both outer borders and inner gutters have thickness rawBw
                        const maxBwX = Math.max(0, (gridW - safeCols * 2) / (safeCols + 1));
                        const maxBwY = Math.max(0, (gridH - safeRows * 2) / (safeRows + 1));
                        bwX = Math.min(rawBw, maxBwX);
                        bwY = Math.min(rawBw, maxBwY);
                        const availW = Math.max(safeCols * 2, gridW - (safeCols + 1) * bwX);
                        const availH = Math.max(safeRows * 2, gridH - (safeRows + 1) * bwY);
                        cellW = availW / safeCols;
                        cellH = availH / safeRows;
                        offsetX = bwX;
                        offsetY = bwY;
                    } else {
                        // 'inner': Only inner gutters between adjacent cells
                        const maxBwX = safeCols > 1 ? Math.max(0, (gridW - safeCols * 2) / (safeCols - 1)) : 0;
                        const maxBwY = safeRows > 1 ? Math.max(0, (gridH - safeRows * 2) / (safeRows - 1)) : 0;
                        bwX = safeCols > 1 ? Math.min(rawBw, maxBwX) : 0;
                        bwY = safeRows > 1 ? Math.min(rawBw, maxBwY) : 0;
                        const availW = Math.max(safeCols * 2, gridW - (safeCols - 1) * bwX);
                        const availH = Math.max(safeRows * 2, gridH - (safeRows - 1) * bwY);
                        cellW = availW / safeCols;
                        cellH = availH / safeRows;
                        offsetX = 0;
                        offsetY = 0;
                    }
                } else {
                    cellW = gridW / safeCols;
                    cellH = gridH / safeRows;
                }

                const slices: string[] = [];
                const thumbs: string[] = [];

                for (let r = 0; r < safeRows; r++) {
                    for (let c = 0; c < safeCols; c++) {
                        const sx = Math.round(gridX + offsetX + c * (cellW + bwX));
                        const sy = Math.round(gridY + offsetY + r * (cellH + bwY));
                        const maxAllowedW = Math.max(1, naturalW - sx);
                        const maxAllowedH = Math.max(1, naturalH - sy);
                        const sw = Math.max(1, Math.min(Math.round(cellW), maxAllowedW));
                        const sh = Math.max(1, Math.min(Math.round(cellH), maxAllowedH));

                        const canvas = document.createElement('canvas');
                        canvas.width = sw;
                        canvas.height = sh;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
                            const fullData = canvas.toDataURL('image/png');
                            slices.push(fullData);

                            // Create small thumbnail for UI
                            const thumb = await generateThumbnail(fullData, 200, 200);
                            thumbs.push(thumb);
                        }
                    }
                }

                resolve({ slices, thumbs });
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = () => {
            reject(new Error('Failed to load image for grid slicing.'));
        };
        img.src = base64Image;
    });
};

/**
 * Helper to convert dataURL or URL to a File and attach all necessary DataTransfer formats
 * so that dragging works seamlessly into:
 * 1. Internal canvas / nodes (application/prompt-modifier-drag-image)
 * 2. Other browser windows / tabs (HTML img, File, uri-list, URL, plain text)
 * 3. External applications (Telegram, Discord, Photoshop, Desktop file drop)
 */
export const setupImageDragData = (
    e: React.DragEvent | DragEvent,
    imageSrc: string,
    filename: string = `Image_${Date.now()}.png`,
    prompt?: string
) => {
    if (!imageSrc || !e.dataTransfer) return;

    try {
        e.dataTransfer.effectAllowed = 'copy';

        // 1. Internal App drag keys
        e.dataTransfer.setData('application/prompt-modifier-drag-image', imageSrc);
        if (prompt) {
            e.dataTransfer.setData('application/prompt-modifier-drag-info', JSON.stringify({
                src: imageSrc,
                prompt
            }));
        }

        // 2. Standard Text, URL, and URI List for browsers
        e.dataTransfer.setData('text/uri-list', imageSrc);
        e.dataTransfer.setData('URL', imageSrc);
        e.dataTransfer.setData('text/plain', imageSrc);

        // 3. HTML snippet for rich text drops and other browsers
        const htmlSnippet = `<img src="${imageSrc}" alt="${filename}" />`;
        e.dataTransfer.setData('text/html', htmlSnippet);

        // 4. DownloadURL (Chromium native file drag to desktop/other windows)
        const mime = imageSrc.startsWith('data:image/jpeg') ? 'image/jpeg' :
                     imageSrc.startsWith('data:image/webp') ? 'image/webp' : 'image/png';
        e.dataTransfer.setData('DownloadURL', `${mime}:${filename}:${imageSrc}`);

        // 5. Native File object attachment in DataTransferItems (Crucial for external apps & other browsers drop zones)
        if (imageSrc.startsWith('data:') && e.dataTransfer.items && typeof File !== 'undefined') {
            try {
                const arr = imageSrc.split(',');
                const mimeMatch = arr[0].match(/:(.*?);/);
                const fileMime = mimeMatch ? mimeMatch[1] : 'image/png';
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n);
                }
                const file = new File([u8arr], filename, { type: fileMime });
                e.dataTransfer.items.add(file);
            } catch (fileErr) {
                console.warn('Could not add File to dataTransfer items:', fileErr);
            }
        }
    } catch (err) {
        console.error('Error setting drag data:', err);
    }
};

export const getImageTimestampString = (dateObj: Date = new Date()): string => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
};
