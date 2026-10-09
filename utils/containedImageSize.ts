export function containedImageSize(width: number, height: number, image: { width: number; height: number } | null) {
    if (width <= 0 || height <= 0 || !image || image.width <= 0 || image.height <= 0) return null;
    const scale = Math.min(width / image.width, height / image.height);
    return { width: image.width * scale, height: image.height * scale };
}
