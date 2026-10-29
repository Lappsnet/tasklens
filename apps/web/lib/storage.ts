import { hasSupabase, serviceClient } from "./supabase-server";

const BUCKET = process.env.STORAGE_BUCKET ?? "media";

/** True when the private media bucket is reachable (service role). */
export function hasStorage(): boolean {
  return hasSupabase();
}

/**
 * Upload a photo to the private `media` bucket. Random object name, content
 * type preserved. Returns the object path, or null when storage is unavailable
 * (demo keeps photos client-side only).
 */
export async function uploadPhoto(buf: Uint8Array, mime: string, prefix: string): Promise<string | null> {
  const db = serviceClient();
  if (!db) return null;
  try {
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const name = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const { error } = await db.storage.from(BUCKET).upload(name, buf, { contentType: mime, upsert: false });
    if (error) {
      console.error("[storage] upload failed:", error.message);
      return null;
    }
    return name;
  } catch (e) {
    console.error("[storage] error:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Short-lived signed URL (60 s) for a private object. Null when unavailable. */
export async function signPhotoUrl(path: string, expiresIn = 60): Promise<string | null> {
  const db = serviceClient();
  if (!db) return null;
  try {
    const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, expiresIn);
    if (error || !data) {
      console.error("[storage] sign failed:", error?.message);
      return null;
    }
    return data.signedUrl;
  } catch (e) {
    console.error("[storage] sign error:", e instanceof Error ? e.message : e);
    return null;
  }
}
