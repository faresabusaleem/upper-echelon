"use client";

/**
 * Client-side preparation before upload: downscale large images and re-encode them, so uploads stay
 * small and fast. (The server re-encodes again and strips all metadata regardless.)
 */
export async function prepareImage(file: Blob, maxSide = 2400, type = "image/webp", quality = 0.9): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), type, quality));
}

/** Crops an image to the given pixel area (from react-easy-crop) and returns a WebP blob. */
export async function cropImage(
  src: string,
  area: { x: number; y: number; width: number; height: number },
  outWidth: number,
  outHeight: number,
): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
  const canvas = document.createElement("canvas");
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, outWidth, outHeight);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("crop failed"))), "image/webp", 0.92));
}

export async function uploadImage(blob: Blob, kind: "avatar" | "banner" | "forum" | "proof") {
  const fd = new FormData();
  fd.append("file", new File([blob], `${kind}.webp`, { type: blob.type || "image/webp" }));
  fd.append("kind", kind);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const body = await res.json().catch(() => ({ ok: false, message: "Upload failed." }));
  if (!res.ok || !body.ok) throw new Error(body.message ?? "Upload failed.");
  return body as { ok: true; url?: string; path?: string; width?: number; height?: number };
}
