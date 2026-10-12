// ============================================
// COMPRESS IMAGE - shared by single and group progress image uploads
// ============================================
// Location: src/utils/compressImage.js

import Compressor from 'compressorjs';

export const DEFAULT_COMPRESSION = {
  quality: 0.7,
  maxWidth: 800,
  maxHeight: 800,
};

/**
 * Compress an image File. Resolves with a new File (same name and type).
 */
export const compressImage = (file, options = DEFAULT_COMPRESSION) =>
  new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: options.quality,
      maxWidth: options.maxWidth,
      maxHeight: options.maxHeight,
      mimeType: file.type,
      success(result) {
        resolve(new File([result], file.name, { type: file.type }));
      },
      error: reject,
    });
  });
