"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { cropImage, uploadImage } from "@/lib/image-client";
import { Button } from "./button";
import { Notice } from "./notice";

/**
 * Pick an image, frame it, upload it. Used for avatars (round, 1:1) and banners (3:1).
 */
export function ImageCropper({
  kind,
  current,
  onUploaded,
  label,
}: {
  kind: "avatar" | "banner";
  current?: string | null;
  onUploaded?: (url: string) => void;
  label?: string;
}) {
  const aspect = kind === "avatar" ? 1 : 3;
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(current ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (src) URL.revokeObjectURL(src);
  }, [src]);

  const onComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  const save = async () => {
    if (!src || !area) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await cropImage(src, area, kind === "avatar" ? 512 : 1800, kind === "avatar" ? 512 : 600);
      const res = await uploadImage(blob, kind);
      if (res.url) {
        setPreview(res.url);
        onUploaded?.(res.url);
      }
      setSrc(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {!src && (
        <div className="flex flex-wrap items-center gap-5">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              className={kind === "avatar" ? "size-24 rounded-full object-cover" : "aspect-[3/1] w-full max-w-md object-cover"}
            />
          ) : (
            <div className={kind === "avatar" ? "size-24 rounded-full bg-panel-2" : "aspect-[3/1] w-full max-w-md bg-panel-2"} />
          )}
          <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
            {label ?? (preview ? "Replace" : "Choose an image")}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              if (f.size > 15 * 1024 * 1024) return setError("Choose an image under 15 MB.");
              setZoom(1);
              setCrop({ x: 0, y: 0 });
              setSrc(URL.createObjectURL(f));
            }}
          />
        </div>
      )}
      {src && (
        <div className="flex flex-col gap-4">
          <div className="relative h-[min(60svh,420px)] w-full bg-sunk">
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape={kind === "avatar" ? "round" : "rect"}
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onComplete}
            />
          </div>
          <label className="flex items-center gap-4 text-small text-ink-2">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full max-w-xs accent-[var(--color-gold)]"
            />
          </label>
          <div className="flex gap-3">
            <Button type="button" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Use this framing"}
            </Button>
            <Button type="button" variant="quiet" onClick={() => setSrc(null)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <p className="text-micro text-muted">Location data and other metadata are removed from every image you upload.</p>
    </div>
  );
}
