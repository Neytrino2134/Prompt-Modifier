// Display derivatives only. Original bytes never pass through this encoder
// for upload, project persistence, or processing on a server.
self.onmessage = async (event: MessageEvent<{ src: string; width: number; height: number }>) => {
    let bitmap: ImageBitmap | undefined;
    let canvas: OffscreenCanvas | undefined;
    try {
        const { src, width, height } = event.data;
        bitmap = await createImageBitmap(await (await fetch(src)).blob());
        const ratio = Math.min(1, width / bitmap.width, height / bitmap.height);
        canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * ratio)), Math.max(1, Math.round(bitmap.height * ratio)));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Offscreen canvas unavailable');
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close(); bitmap = undefined;
        const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.82 });
        self.postMessage({ blob });
    } catch (error) { self.postMessage({ error: String(error) }); }
    finally {
        bitmap?.close();
        if (canvas) canvas.width = canvas.height = 0;
    }
};

export {};
