import { expect, test, describe, beforeAll } from "bun:test";
import { compressImage } from "./imageCompressor";

let lastCanvasWidth = 0;
let lastCanvasHeight = 0;

// Mock browser APIs since this is running in a Node/Bun CLI environment rather than a browser
beforeAll(() => {
  global.FileReader = class {
    onload: ((e: any) => void) | null = null;
    onerror: ((e: any) => void) | null = null;
    readAsDataURL(file: any) {
      setTimeout(() => {
        if (this.onload) {
          this.onload({ target: { result: "data:image/png;base64,mockedbase64string" } });
        }
      }, 0);
    }
  } as any;

  global.Image = class {
    width = 2000;
    height = 1000;
    onload: (() => void) | null = null;
    onerror: ((e: any) => void) | null = null;
    set src(value: string) {
      setTimeout(() => {
        if (this.onload) this.onload();
      }, 0);
    }
  } as any;

  const mockCanvas = {
    get width() {
      return lastCanvasWidth;
    },
    set width(val) {
      lastCanvasWidth = val;
    },
    get height() {
      return lastCanvasHeight;
    },
    set height(val) {
      lastCanvasHeight = val;
    },
    getContext: (contextId: string) => {
      if (contextId === "2d") {
        return {
          drawImage: () => {},
        };
      }
      return null;
    },
    toBlob: (callback: (blob: any) => void, type: string, quality: number) => {
      const mockBlob = new Blob(["mock-compressed-data"], { type });
      callback(mockBlob);
    },
  };

  global.document = {
    createElement: (tag: string) => {
      if (tag === "canvas") {
        return mockCanvas;
      }
      return {};
    },
  } as any;
});

describe("compressImage", () => {
  test("should skip non-image files and return the original file object", async () => {
    const file = new File(["dummy pdf content"], "document.pdf", { type: "application/pdf" });
    const result = await compressImage(file);
    expect(result).toBe(file);
  });

  test("should skip animated GIF files to preserve animations", async () => {
    const file = new File(["dummy gif content"], "avatar.gif", { type: "image/gif" });
    const result = await compressImage(file);
    expect(result).toBe(file);
  });

  test("should compress standard image (e.g. PNG) and convert it to WebP", async () => {
    const file = new File(["dummy png content"], "photo.png", { type: "image/png" });
    const result = await compressImage(file, {
      maxWidth: 1000,
      maxHeight: 1000,
      quality: 0.8,
      outputType: "image/webp",
    });

    expect(result).not.toBe(file);
    expect(result.type).toBe("image/webp");
    expect(result.name).toBe("photo.webp");
  });

  test("should correctly resize a large image (2000x1000) preserving aspect ratio within limits", async () => {
    const file = new File(["dummy png content"], "large-photo.png", { type: "image/png" });
    
    // Test for avatar limit (512x512px limit)
    // 2000x1000 scaled down to fit within 512x512 should become 512x256
    await compressImage(file, {
      maxWidth: 512,
      maxHeight: 512,
    });
    
    expect(lastCanvasWidth).toBe(512);
    expect(lastCanvasHeight).toBe(256);

    // Test for gallery limit (1600x1600px limit)
    // 2000x1000 scaled down to fit within 1600x1600 should become 1600x800
    await compressImage(file, {
      maxWidth: 1600,
      maxHeight: 1600,
    });
    
    expect(lastCanvasWidth).toBe(1600);
    expect(lastCanvasHeight).toBe(800);
  });
});
