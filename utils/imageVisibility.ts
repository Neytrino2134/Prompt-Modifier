export const IMAGE_PRELOAD_MARGIN = 600;
export const IMAGE_UNLOAD_MARGIN = 900;

// Screen pixels, independent of canvas zoom and intermediate overflow clipping.
export function isImageNearViewport(rect: { left: number; right: number; top: number; bottom: number }, width: number, height: number, wasVisible: boolean) {
    const margin = wasVisible ? IMAGE_UNLOAD_MARGIN : IMAGE_PRELOAD_MARGIN;
    return rect.right >= -margin && rect.bottom >= -margin && rect.left <= width + margin && rect.top <= height + margin;
}
