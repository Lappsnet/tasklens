import { describe, expect, it } from "vitest";
import { TextFields, validateUpload } from "../lib/scan-pipeline";

function photo(name = "p.jpg", type = "image/jpeg", size = 100) {
  return new File([new Uint8Array(size)], name, { type });
}

function form(photos: File[], audio?: File) {
  const fd = new FormData();
  for (const p of photos) fd.append("photos", p, p.name);
  if (audio) fd.append("audio", audio, audio.name);
  return fd;
}

describe("validateUpload (§7 upload allowlist)", () => {
  it("accepts 1–3 valid photos", () => {
    const r = validateUpload(form([photo()]), "photos");
    expect("error" in r).toBe(false);
  });

  it("rejects an empty submission", () => {
    expect(validateUpload(form([]), "photos")).toEqual({ error: "need_photo" });
  });

  it("rejects more than 3 photos", () => {
    expect(validateUpload(form([photo("1.jpg"), photo("2.jpg"), photo("3.jpg"), photo("4.jpg")]), "photos")).toEqual({
      error: "need_photo",
    });
  });

  it("rejects disallowed mime types", () => {
    const gif = new File([new Uint8Array(10)], "a.gif", { type: "image/gif" });
    expect(validateUpload(form([gif]), "photos")).toEqual({ error: "bad_photo" });
  });

  it("rejects oversized photos (>10 MB)", () => {
    const big = new File([new Uint8Array(10)], "big.jpg", { type: "image/jpeg" });
    Object.defineProperty(big, "size", { value: 11 * 1024 * 1024 });
    expect(validateUpload(form([big]), "photos")).toEqual({ error: "bad_photo" });
  });

  it("accepts a valid voice note and rejects a bad one", () => {
    const ok = new File([new Uint8Array(10)], "n.webm", { type: "audio/webm" });
    const r = validateUpload(form([photo()], ok), "photos");
    expect("error" in r).toBe(false);
    if (!("error" in r)) expect(r.audio?.type).toBe("audio/webm");

    const bad = new File([new Uint8Array(10)], "n.bin", { type: "application/octet-stream" });
    expect(validateUpload(form([photo()], bad), "photos")).toEqual({ error: "bad_audio" });
  });
});

describe("TextFields", () => {
  it("defaults lang to en and trims nothing (trimming is the pipeline's job)", () => {
    const p = TextFields.safeParse({ transcript: "", lang: "xx" });
    expect(p.success).toBe(false);
    const ok = TextFields.safeParse({ transcript: "x".repeat(2001) });
    expect(ok.success).toBe(false);
  });
});
