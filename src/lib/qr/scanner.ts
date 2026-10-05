import jsQR from "jsqr";

export interface QRScanResult {
  success: boolean;
  rawText?: string;
  extractedUrl?: string;
  error?: string;
}

/**
 * Decodes QR code from raw ImageData (Uint8ClampedArray + width + height).
 */
export function decodeQRFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number
): QRScanResult {
  try {
    const code = jsQR(data, width, height, {
      inversionAttempts: "attemptBoth",
    });

    if (!code || !code.data) {
      return {
        success: false,
        error: "No QR code could be detected in the provided image.",
      };
    }

    const rawText = code.data.trim();

    // Check if the QR payload represents a URL
    let extractedUrl: string | undefined;
    if (/^https?:\/\//i.test(rawText)) {
      extractedUrl = rawText;
    } else if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/i.test(rawText)) {
      extractedUrl = `https://${rawText}`;
    }

    return {
      success: true,
      rawText,
      extractedUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to decode QR code",
    };
  }
}

/**
 * Client-side helper that loads an image File/Blob onto an HTML Canvas and runs jsQR.
 */
export async function scanQRFromFile(file: File): Promise<QRScanResult> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve({ success: false, error: "Browser environment required for canvas scan" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ success: false, error: "Canvas 2D context unavailable" });
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);

        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const result = decodeQRFromImageData(imageData.data, imageData.width, imageData.height);
        resolve(result);
      };
      img.onerror = () => {
        resolve({ success: false, error: "Failed to load image file into canvas" });
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      resolve({ success: false, error: "Failed to read file data" });
    };
    reader.readAsDataURL(file);
  });
}
