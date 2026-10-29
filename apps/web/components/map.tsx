"use client";

import { useEffect, useRef } from "react";

/** P0-3 Mapbox map with graceful fallback when no token is configured. */
export default function ProMap({ points }: { points: { id: string; lat?: number; lng?: number; label: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const pts = points.filter((p) => p.lat !== undefined && p.lng !== undefined);

  useEffect(() => {
    if (!token || !ref.current || pts.length === 0) return;
    let map: { remove: () => void } | null = null;
    (async () => {
      const mapbox = (await import("mapbox-gl")).default;
      await import("mapbox-gl/dist/mapbox-gl.css");
      (mapbox as unknown as { accessToken: string }).accessToken = token;
      const center = pts[0];
      map = new mapbox.Map({
        container: ref.current as HTMLElement,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [center.lng as number, center.lat as number],
        zoom: 12,
      }) as unknown as { remove: () => void };
      const { Marker, Popup } = await import("mapbox-gl");
      for (const p of pts) {
        new Marker({ color: "#F26A1B" })
          .setLngLat([p.lng as number, p.lat as number])
          .setPopup(new Popup({ offset: 12 }).setText(p.label))
          .addTo(map as never);
      }
    })().catch(() => undefined);
    return () => {
      try {
        map?.remove();
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token || pts.length === 0) {
    return (
      <div className="rounded-card bg-neutral-100 p-4 text-sm text-slate2">
        {pts.length > 0 ? `${pts.length} pros nearby` : "Map needs a Mapbox token"}
      </div>
    );
  }
  return <div ref={ref} className="rounded-card h-56 overflow-hidden" aria-label="pro locations map" />;
}
