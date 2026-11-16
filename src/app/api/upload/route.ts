import { randomUUID } from "node:crypto";
import sharp, { type OutputInfo } from "sharp";
import { getViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { errorJson, json, sameOrigin } from "@/lib/api";

export const runtime = "nodejs";

const KINDS = {
  avatar: { bucket: "avatars", width: 512, height: 512, fit: "cover" as const, quality: 82 },
  banner: { bucket: "banners", width: 1800, height: 600, fit: "cover" as const, quality: 80 },
  forum: { bucket: "forum", width: 1800, height: 1800, fit: "inside" as const, quality: 80 },
  proof: { bucket: "proofs", width: 2000, height: 2000, fit: "inside" as const, quality: 80 },
};
type Kind = keyof typeof KINDS;

const MAX_BYTES = 6 * 1024 * 1024;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

/**
 * Image uploads. Every image is decoded and re-encoded on the server, which strips EXIF data
 * (including GPS location), normalises orientation, bounds its size, and converts it to WebP.
 * Only then is it stored, with the service role, under the member's own folder.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return errorJson("Cross-site request refused.", 403);
  const viewer = await getViewer();
  if (!viewer || !viewer.profile.onboarded_at) return errorJson("Sign in first.", 401, "unauthenticated");
  if (viewer.ban) return errorJson("Your account is suspended.", 403, "forbidden");

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const kind = String(form?.get("kind") ?? "") as Kind;
  if (!(kind in KINDS)) return errorJson("Unknown upload kind.", 400);
  if (kind === "forum" && viewer.mute) return errorJson("You are muted and cannot post images right now.", 403, "forbidden");
  if (!(file instanceof File)) return errorJson("No file received.", 400);
  if (file.size > MAX_BYTES) return errorJson("Images must be under 6 MB.", 413);
  if (!ACCEPTED.has(file.type)) return errorJson("Use a JPEG, PNG, WebP, GIF or AVIF image.", 415);

  const admin = createAdminClient();
  const { data: allowed } = await admin.rpc("hit_rate_limit", {
    p_key: `upload:${viewer.id}`,
    p_max: 30,
    p_window_seconds: 3600,
  });
  if (allowed === false) return errorJson("Too many uploads. Try again in an hour.", 429, "rate_limited");

  const spec = KINDS[kind];
  let output: { data: Buffer; info: OutputInfo };
  try {
    output = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 50_000_000, animated: false })
      .rotate() // apply EXIF orientation before the metadata is dropped
      .resize({ width: spec.width, height: spec.height, fit: spec.fit, withoutEnlargement: spec.fit === "inside" })
      .webp({ quality: spec.quality, effort: 4 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    return errorJson("That file could not be read as an image.", 422);
  }

  const path = `${viewer.id}/${randomUUID()}.webp`;
  const { error: upError } = await admin.storage
    .from(spec.bucket)
    .upload(path, output.data, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (upError) return errorJson("The image could not be stored. Try again.", 500);

  await admin.from("uploads").insert({
    user_id: viewer.id,
    bucket: spec.bucket,
    path: `${spec.bucket}/${path}`,
    width: output.info.width,
    height: output.info.height,
    bytes: output.info.size,
  });

  if (kind === "proof") return json({ ok: true, path });

  const url = admin.storage.from(spec.bucket).getPublicUrl(path).data.publicUrl;
  if (kind === "avatar" || kind === "banner") {
    const column = kind === "avatar" ? "avatar_url" : "banner_url";
    const previous = viewer.profile[column];
    await admin.from("profiles").update(kind === "avatar" ? { avatar_url: url } : { banner_url: url }).eq("id", viewer.id);
    const marker = `/storage/v1/object/public/${spec.bucket}/`;
    if (previous?.includes(marker)) {
      const oldPath = previous.split(marker)[1];
      if (oldPath?.startsWith(`${viewer.id}/`)) {
        await admin.storage.from(spec.bucket).remove([oldPath]);
        await admin.from("uploads").delete().eq("path", `${spec.bucket}/${oldPath}`);
      }
    }
  }
  return json({ ok: true, url, width: output.info.width, height: output.info.height });
}
