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
