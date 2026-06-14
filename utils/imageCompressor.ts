interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  outputType?: "image/webp" | "image/jpeg";
}

/**
 * Compresses and resizes an image on the client side using the Canvas API.
 * 
 * @param file The original File object selected by the user.
 * @param options Configurations for resizing and compression.
 * @returns A promise resolving to a compressed File object (usually WebP), or the original file if compression is skipped.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    outputType = "image/webp", // WebP offers the best compression
  } = options;

  // Skip compression for non-images and animated GIFs
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions preserving aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          // Fallback to original file if 2d context is unavailable
          resolve(file);
          return;
        }

        // Draw image onto the canvas at the calculated size
        ctx.drawImage(img, 0, 0, width, height);

        // Export canvas content as a compressed Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            // Create a new File from the compressed Blob
            const fileExt = outputType.split("/")[1];
            const originalName = file.name.substring(0, file.name.lastIndexOf("."));
            const newFileName = `${originalName || "image"}.${fileExt}`;

            const compressedFile = new File([blob], newFileName, {
              type: outputType,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          outputType,
          quality
        );
      };

      // Browser không decode được (heic, avif cũ...) → fallback upload file gốc thay vì lỗi
      img.onerror = () => resolve(file);
    };

    reader.onerror = (err) => reject(new Error("Failed to read image file: " + err));
  });
}
