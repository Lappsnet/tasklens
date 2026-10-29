import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** P0-4: generated OG card (wordmark + tagline). Replaced by a Muse Image render when a key exists. */
export default function OgImage() {
  return new ImageResponse(
    {
      type: "div",
      props: {
        style: {
          width: 1200, height: 630, display: "flex", flexDirection: "column", justifyContent: "center",
          padding: 80, background: "#FAF7F2", color: "#0F1B2D", fontFamily: "system-ui, sans-serif",
        },
        children: [
          { type: "div", props: { style: { fontSize: 36, fontWeight: 800, color: "#F26A1B" }, children: "TaskLens" } },
          { type: "div", props: { style: { fontSize: 64, fontWeight: 800, lineHeight: 1.1, marginTop: 16 }, children: "Tu reparación, cotizada en segundos." } },
          { type: "div", props: { style: { fontSize: 30, marginTop: 16, color: "#64748B" }, children: "Mira · Habla · Reserva · Verifica — escrow protegido" } },
        ],
      },
    } as never,
    { width: 1200, height: 630 },
  );
}
