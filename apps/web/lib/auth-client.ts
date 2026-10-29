"use client";

import { createClient } from "@supabase/supabase-js";

export function hasSupabaseBrowser(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function browserAuth() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  return createClient(url, anon);
}

/** Demo login: rate-limited server endpoint sets a role cookie. */
export async function demoLogin(role: "customer" | "pro" | "admin"): Promise<boolean> {
  const res = await fetch("/api/auth/demo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  return res.ok;
}

export async function demoLogout(): Promise<void> {
  await fetch("/api/auth/demo", { method: "DELETE" });
}
