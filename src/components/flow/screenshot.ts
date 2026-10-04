// Read a picture the visitor chose and shrink it in the browser before it is sent.
// Long edge is capped so a phone screenshot becomes a small JPEG data URL.

export interface ShrunkImage {
  dataUrl: string;
  width: number;
  height: number;
  /** approximate size of the encoded JPEG */
  bytes: number;
  name: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("unreadable"));
    img.src = src;
  });
}

export function looksLikeImage(file: File): boolean {
  return file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|heic|heif|avif)$/i.test(file.name);
}

export async function shrinkImage(file: File, maxEdge = 1600, quality = 0.8): Promise<ShrunkImage> {
  if (!looksLikeImage(file)) throw new Error("not-image");
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const w0 = img.naturalWidth;
    const h0 = img.naturalHeight;
    if (!w0 || !h0) throw new Error("unreadable");

    const scale = Math.min(1, maxEdge / Math.max(w0, h0));
    const width = Math.max(1, Math.round(w0 * scale));
    const height = Math.max(1, Math.round(h0 * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("unreadable");
    // screenshots with transparency would otherwise turn black as a JPEG
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (!dataUrl.startsWith("data:image/jpeg")) throw new Error("unreadable");
    const base64Length = dataUrl.length - dataUrl.indexOf(",") - 1;
    return { dataUrl, width, height, bytes: Math.round(base64Length * 0.75), name: file.name || "screenshot" };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
