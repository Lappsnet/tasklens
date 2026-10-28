import type { ProCandidate } from "@tasklens/ai";
import { hasSupabase, serviceClient } from "./supabase-server";

/** Demo pool mirroring the seed (used when Supabase is not configured). */
const MOCK_PROS: ProCandidate[] = [
  { id: "mock-carlos", name: "Carlos Mendez", category: "plumbing", rating: 4.9, rate_usd_hr: 95, city: "Miami, FL", lat: 25.7617, lng: -80.1918 },
  { id: "mock-rosa", name: "Rosa Jimenez", category: "plumbing", rating: 4.8, rate_usd_hr: 85, city: "Miami, FL", lat: 25.7743, lng: -80.1937 },
  { id: "mock-dave", name: "Dave Kowalski", category: "plumbing", rating: 4.7, rate_usd_hr: 90, city: "Miami, FL", lat: 25.7825, lng: -80.209 },
  { id: "mock-mike", name: "Mike Ross", category: "electrical", rating: 4.9, rate_usd_hr: 110, city: "Miami, FL", lat: 25.7617, lng: -80.1918 },
  { id: "mock-elena", name: "Elena Vasquez", category: "electrical", rating: 4.8, rate_usd_hr: 105, city: "Miami, FL", lat: 25.765, lng: -80.2 },
  { id: "mock-maria", name: "Maria Gonzalez", category: "appliance", rating: 4.9, rate_usd_hr: 85, city: "Miami, FL", lat: 25.77, lng: -80.19 },
  { id: "mock-carmen", name: "Carmen Diaz", category: "drywall_paint", rating: 4.9, rate_usd_hr: 70, city: "Miami, FL", lat: 25.766, lng: -80.196 },
  { id: "mock-alex", name: "Alex Johnson", category: "assembly", rating: 4.9, rate_usd_hr: 55, city: "Miami, FL", lat: 25.7617, lng: -80.1918 },
  { id: "mock-lucia", name: "Clean Team Lucia", category: "cleaning", rating: 4.9, rate_usd_hr: 45, city: "Miami, FL", lat: 25.7617, lng: -80.1918 },
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
