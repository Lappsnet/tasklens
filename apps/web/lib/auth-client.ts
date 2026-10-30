"use client";

import { createBrowserClient } from "@supabase/ssr";

export function hasSupabaseBrowser(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Cookie-based browser client (U3): shares the session with server routes. */
export function browserAuth() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  return createBrowserClient(url, anon);
}

/** Demo login: rate-limited server endpoint sets a role cookie. */
export async function demoLogin(role: "customer" | "pro" | "company" | "admin" | "city_operator", city_slug?: string): Promise<boolean> {
  const res = await fetch("/api/auth/demo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, city_slug }),
  });
  return res.ok;
}

/** Production "Try as …": server signs in to the seeded demo account, browser takes the session. */
export async function demoLoginServer(role: "customer" | "pro"): Promise<boolean> {
  const res = await fetch("/api/auth/demo-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) return false;
  const json = (await res.json()) as { access_token?: string; refresh_token?: string };
  if (!json.access_token || !json.refresh_token) return false;
  const { error } = await browserAuth().auth.setSession({
    access_token: json.access_token,
    refresh_token: json.refresh_token,
  });
  return !error;
}

export async function demoLogout(): Promise<void> {
  await fetch("/api/auth/demo", { method: "DELETE" });
}
