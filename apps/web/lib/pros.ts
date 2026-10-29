import type { ProCandidate } from "@tasklens/ai";
import { hasSupabase, serviceClient } from "./supabase-server";

/** Demo pool mirroring the ES seed (used when Supabase is not configured). */
const MOCK_PROS: ProCandidate[] = [
  { id: "mock-carlos", name: "Carlos Méndez", category: "plumbing", rating: 4.9, rate_usd_hr: 45, city: "San Salvador, SV", lat: 13.6929, lng: -89.2182 },
  { id: "mock-rosa", name: "Rosa Jiménez", category: "plumbing", rating: 4.8, rate_usd_hr: 40, city: "San Salvador, SV", lat: 13.7, lng: -89.2 },
  { id: "mock-dave", name: "David Rivas", category: "plumbing", rating: 4.7, rate_usd_hr: 42, city: "Santa Tecla, SV", lat: 13.71, lng: -89.23 },
  { id: "mock-mike", name: "Miguel Rosales", category: "electrical", rating: 4.9, rate_usd_hr: 50, city: "San Salvador, SV", lat: 13.6929, lng: -89.2182 },
  { id: "mock-elena", name: "Elena Vásquez", category: "electrical", rating: 4.8, rate_usd_hr: 48, city: "San Salvador, SV", lat: 13.705, lng: -89.205 },
  { id: "mock-maria", name: "María González", category: "appliance", rating: 4.9, rate_usd_hr: 40, city: "San Salvador, SV", lat: 13.7, lng: -89.21 },
  { id: "mock-carmen", name: "Carmen Díaz", category: "drywall_paint", rating: 4.9, rate_usd_hr: 32, city: "San Salvador, SV", lat: 13.706, lng: -89.206 },
  { id: "mock-alex", name: "Alex Johnson", category: "assembly", rating: 4.9, rate_usd_hr: 25, city: "San Salvador, SV", lat: 13.6929, lng: -89.2182 },
  { id: "mock-lucia", name: "Lucía Herrera", category: "cleaning", rating: 4.9, rate_usd_hr: 20, city: "San Salvador, SV", lat: 13.6929, lng: -89.2182 },
  { id: "mock-sofia", name: "Sofía Ramírez", category: "electrical", rating: 4.6, rate_usd_hr: 40, city: "Santa Ana, SV", lat: 13.9949, lng: -89.5596 },
];

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const r = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(s));
}

export async function searchPros(args: {
  category: string;
  lat: number;
  lng: number;
  max_km: number;
}): Promise<ProCandidate[]> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data, error } = await db
          .from("pros")
          .select("id,name,category,rating,rate_usd_hr,city,lat,lng")
          .eq("category", args.category)
          .order("rating", { ascending: false })
          .limit(10);
        if (!error && data?.length) {
          return (data as ProCandidate[]).filter(
            (p) =>
              distanceKm(args.lat, args.lng, p.lat ?? args.lat, p.lng ?? args.lng) <= args.max_km,
          );
        }
      }
    } catch (e) {
      console.error("[pros] supabase error:", e instanceof Error ? e.message : e);
    }
  }
  return MOCK_PROS.filter(
    (p) =>
      p.category === args.category &&
      distanceKm(args.lat, args.lng, p.lat ?? args.lat, p.lng ?? args.lng) <= args.max_km,
  );
}

/** Next-7-days morning/afternoon windows. Real availability table lookup lands Day 4. */
export async function getAvailability(pro_id: string): Promise<string[]> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data, error } = await db.from("availability").select("day,slots").eq("pro_id", pro_id).limit(7);
        if (!error && data?.length) {
          return (data as { day: string; slots: string[] }[]).flatMap((r) =>
            (r.slots ?? []).map((s) => `${r.day}T${s}`),
          );
        }
      }
    } catch (e) {
      console.error("[pros] availability error:", e instanceof Error ? e.message : e);
    }
  }
  const out: string[] = [];
  const now = new Date();
  for (let d = 1; d <= 3; d++) {
    const day = new Date(now);
    day.setDate(now.getDate() + d);
    const iso = day.toISOString().slice(0, 10);
    out.push(`${iso}T09:00`, `${iso}T14:00`);
  }
  return out;
}
