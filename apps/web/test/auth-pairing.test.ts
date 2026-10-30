import { describe, expect, it } from "vitest";
import { __clearPairings, claimPairing, createPairing, markGlassesReady } from "../lib/pairings";
import { POST as mint } from "../app/api/glasses/pairings/route";
import { POST as claim } from "../app/api/glasses/pairings/claim/route";
import { POST as ready } from "../app/api/glasses/pairings/ready/route";
import { PATCH as profile } from "../app/api/profile/route";

const PRO = { cookie: "tasklens_demo=pro" };

function json(url: string, body: unknown, headers: Record<string, string> = PRO) {
  return new Request(url, { method: body === null ? "GET" : "POST", headers: { ...headers, "Content-Type": "application/json" }, body: body === null ? undefined : JSON.stringify(body) });
}

describe("U3 glasses pairing", () => {
  it("claim is single-use: waiting -> phone_connected, second claim 409s", async () => {
    __clearPairings();
    const { pairing, code } = await createPairing("demo-pro");
    expect(pairing.status).toBe("waiting");
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    const first = await claimPairing(code, "Pixel 8");
    expect(first?.status).toBe("phone_connected");
    expect(await claimPairing(code, "Pixel 8")).toBeNull();
  });

  it("ready only advances phone_connected pairings", async () => {
    __clearPairings();
    const { code } = await createPairing("demo-pro");
    expect(await markGlassesReady(code)).toBeNull();
    await claimPairing(code, "Pixel 8");
    expect((await markGlassesReady(code))?.status).toBe("glasses_ready");
    expect(await markGlassesReady(code)).toBeNull();
  });

  it("mint route returns code + QR svg, claim/ready enforce state", async () => {
    __clearPairings();
    const m = await mint(new Request("http://x/api/glasses/pairings", { method: "POST", headers: PRO }));
    expect(m.status).toBe(200);
    const { code, qrSvg, deepLink } = (await m.json()) as { code: string; qrSvg: string; deepLink: string };
    expect(qrSvg).toContain("<svg");
    expect(deepLink).toContain(code);
    expect((await claim(json("http://x/claim", { code, deviceLabel: "test" }))).status).toBe(200);
    expect((await claim(json("http://x/claim", { code }))).status).toBe(409);
    expect((await ready(json("http://x/ready", { code }))).status).toBe(200);
  });

  it("profile validates input and is a demo no-op", async () => {
    expect((await profile(new Request("http://x/api/profile", { method: "PATCH", headers: { ...PRO, "Content-Type": "application/json" }, body: "{}" }))).status).toBe(400);
    const ok = await profile(
      new Request("http://x/api/profile", { method: "PATCH", headers: { ...PRO, "Content-Type": "application/json" }, body: JSON.stringify({ display_name: "Juan", city_slug: "san-salvador" }) }),
    );
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as { demo: boolean }).demo).toBe(true);
  });
});
