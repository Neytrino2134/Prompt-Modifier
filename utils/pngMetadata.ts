// CRC32 implementation
const crc32 = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return (bytes: Uint8Array): number => {
    let crc = -1;
    for (let i = 0; i < bytes.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xFF];
    }
    return (crc ^ -1) >>> 0;
  };
})();

function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function bytesToText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export const addMetadataToPNG = (base64Image: string, key: string, value: string): string => {
  if (!base64Image.startsWith('data:image/png;base64,')) {
    console.warn("Attempted to add metadata to a non-PNG image.");
    return base64Image;
  }

  try {
    const base64Data = base64Image.substring('data:image/png;base64,'.length);
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Validate PNG signature
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
     if (bytes.length < 8) {
        console.error("Invalid PNG: file is too short.");
        return base64Image;
    }
    for (let i = 0; i < signature.length; i++) {
        if (bytes[i] !== signature[i]) {
            console.error("Invalid PNG signature.");
            return base64Image;
        }
    }

    let iendChunkStart = -1;
    let offset = 8; // Start after signature

    while (offset < bytes.length) {
        if (offset + 8 > bytes.length) {
            console.warn("Malformed PNG: not enough data for chunk header.");
            break;
        }
        const dataView = new DataView(bytes.buffer, offset);
        const length = dataView.getUint32(0, false);
        const typeBytes = bytes.slice(offset + 4, offset + 8);

        if (typeBytes[0] === 73 && typeBytes[1] === 69 && typeBytes[2] === 78 && typeBytes[3] === 68) { // 'IEND'
            iendChunkStart = offset;
            break;
        }
        
        const chunkTotalLength = 12 + length;
        if (offset + chunkTotalLength > bytes.length) {
            console.warn(`Malformed PNG: chunk of type ${bytesToText(typeBytes)} with length ${length} exceeds file bounds.`);
            break;
        }
        offset += chunkTotalLength;
    }
    
    if (iendChunkStart === -1) {
      console.error("Could not find IEND chunk in PNG.");
      return base64Image;
    }

    const keywordBytes = textToBytes(key);
    const valueBytes = textToBytes(value);
    
    const chunkData = new Uint8Array(keywordBytes.length + 1 + valueBytes.length);
    chunkData.set(keywordBytes, 0);
    chunkData.set([0], keywordBytes.length);
    chunkData.set(valueBytes, keywordBytes.length + 1);

    const chunkType = textToBytes('tEXt');
    const crcData = new Uint8Array(chunkType.length + chunkData.length);
    crcData.set(chunkType);
    crcData.set(chunkData, chunkType.length);
    const crc = crc32(crcData);

    const chunkLengthBuffer = new ArrayBuffer(4);
    new DataView(chunkLengthBuffer).setUint32(0, chunkData.length, false);

    const crcBuffer = new ArrayBuffer(4);
    new DataView(crcBuffer).setUint32(0, crc, false);
    
    const textChunkBytes = new Uint8Array([
      ...new Uint8Array(chunkLengthBuffer),
      ...chunkType,
      ...chunkData,
      ...new Uint8Array(crcBuffer)
    ]);

    const newBytes = new Uint8Array(bytes.length + textChunkBytes.length);
    newBytes.set(bytes.slice(0, iendChunkStart), 0);
    newBytes.set(textChunkBytes, iendChunkStart);
    newBytes.set(bytes.slice(iendChunkStart), iendChunkStart + textChunkBytes.length);
    
    let newBinaryString = '';
    for (let i = 0; i < newBytes.length; i++) {
      newBinaryString += String.fromCharCode(newBytes[i]);
    }
    const newBase64 = btoa(newBinaryString);
    
    return `data:image/png;base64,${newBase64}`;
  } catch (e) {
    console.error("Failed to add metadata to PNG:", e);
    return base64Image;
  }
};


export const readMetadataFromPNG = async (base64Image: string): Promise<Record<string, string>> => {
    return new Promise((resolve) => {
        if (!base64Image || !base64Image.startsWith('data:image/png;base64,')) {
            return resolve({});
        }

        try {
            const base64Data = base64Image.substring('data:image/png;base64,'.length);
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < bytes.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const metadata: Record<string, string> = {};
            let offset = 8; // Skip PNG signature

            while (offset < bytes.length) {
                const dataView = new DataView(bytes.buffer, offset);
                if (offset + 8 > bytes.length) break;

                const length = dataView.getUint32(0, false);
                const type = bytesToText(bytes.slice(offset + 4, offset + 8));

                if (offset + 12 + length > bytes.length) break;

                if (type === 'tEXt') {
                    const chunkData = bytes.slice(offset + 8, offset + 8 + length);
                    const nullSeparatorIndex = chunkData.indexOf(0);
                    if (nullSeparatorIndex !== -1) {
                        const keyword = bytesToText(chunkData.slice(0, nullSeparatorIndex));
                        const text = bytesToText(chunkData.slice(nullSeparatorIndex + 1));
                        metadata[keyword] = text;
                    }
                }

                if (type === 'IEND') {
                    break;
                }
                offset += 12 + length; // length + type + data + crc
            }
            resolve(metadata);
        } catch (e) {
            console.error("Failed to read metadata from PNG:", e);
            resolve({});
        }
    });
};

export const readPromptFromPNG = async (base64: string): Promise<string | null> => {
    const meta = await readMetadataFromPNG(base64);
    // Check for common prompt keys used by other AIs for compatibility
    return meta['prompt'] || meta['Prompt'] || meta['parameters'] || meta['Comment'] || null;
}