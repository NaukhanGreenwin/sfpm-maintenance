import type { MediaItem } from "./types";

export const MEDIA_LIMITS = {
  maxFiles: 10,
  imageMaxBytes: 25 * 1024 * 1024, // before compression
  videoMaxBytes: 100 * 1024 * 1024,
  maxEdge: 2048,
  jpegQuality: 0.82,
};

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/3gpp"];
export const ACCEPT_ATTR = [...IMAGE_TYPES, ...VIDEO_TYPES, ".heic", ".heif", ".mov"].join(",");

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  const mb = n / (1024 * 1024);
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}

export function classify(file: File): "image" | "video" | null {
  const t = file.type.toLowerCase();
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (IMAGE_TYPES.includes(t) || ["heic", "heif"].includes(ext)) return "image";
  if (VIDEO_TYPES.includes(t) || ["mov", "mp4", "webm"].includes(ext)) return "video";
  return null;
}

export function validateFile(file: File): string | null {
  const kind = classify(file);
  if (!kind) return `${file.name}: please add a photo (JPG, PNG, HEIC, WebP) or a video (MP4, MOV).`;
  if (kind === "image" && file.size > MEDIA_LIMITS.imageMaxBytes)
    return `${file.name} is larger than ${formatBytes(MEDIA_LIMITS.imageMaxBytes)}.`;
  if (kind === "video" && file.size > MEDIA_LIMITS.videoMaxBytes)
    return `${file.name} is larger than ${formatBytes(MEDIA_LIMITS.videoMaxBytes)}. A shorter clip works best.`;
  return null;
}

/** Downscale to maxEdge and re-encode as JPEG. Falls back to the original when the
 *  browser cannot decode the format (e.g. HEIC outside Safari) or when it would grow. */
export async function compressImage(file: File): Promise<{ blob: Blob; compressed: boolean }> {
  if (file.type === "image/gif") return { blob: file, compressed: false };
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MEDIA_LIMITS.maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", MEDIA_LIMITS.jpegQuality),
    );
    if (!blob || blob.size >= file.size) return { blob: file, compressed: false };
    return { blob, compressed: true };
  } catch {
    return { blob: file, compressed: false };
  }
}

let counter = 0;
export function newMediaItem(file: File, kind: "image" | "video"): MediaItem {
  counter += 1;
  return {
    id: `m${Date.now().toString(36)}${counter}`,
    name: file.name,
    kind,
    status: kind === "image" ? "processing" : "ready",
    blob: kind === "video" ? file : null,
    previewUrl: URL.createObjectURL(file),
    originalBytes: file.size,
    finalBytes: file.size,
    compressed: false,
    caption: "",
  };
}
