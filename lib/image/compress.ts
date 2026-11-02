// Shrinks a photo or screenshot in the browser before it is sent for checking.
// Drawing it onto a canvas and saving a new JPEG also removes EXIF data such as location.

import { MAX_IMAGE_DATA_URL_LENGTH } from "@/lib/check/request";

export const MAX_IMAGE_SIDE = 1600;
export const JPEG_QUALITY = 0.8;

export function fitWithin(width: number, height: number, max = MAX_IMAGE_SIDE): { width: number; height: number } {
  if (width <= max && height <= max) return { width, height };
  const scale = max / Math.max(width, height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function loadWithImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not open the picture."));
    };
    img.src = url;
  });
}

// Returns a JPEG data URL, or throws if the picture cannot be opened.
export async function compressImage(file: File): Promise<string> {
  let source: ImageBitmap | HTMLImageElement;
  try {
    // "from-image" turns photos the right way up using their orientation tag.
    source = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    source = await loadWithImageElement(file);
  }

  const { width, height } = fitWithin(source.width, source.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not open the picture.");
  // White behind transparent screenshots, so text stays readable as JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  if ("close" in source) source.close();

  let dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  if (dataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) dataUrl = canvas.toDataURL("image/jpeg", 0.6);
  if (dataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) throw new Error("The picture is too large.");
  return dataUrl;
}
