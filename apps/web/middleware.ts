import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const isProd = process.env.NODE_ENV === "production";

/**
 * P0-1: security headers with an environment-aware Content-Security-Policy.
 * - Staging/dev keep 'unsafe-eval' (Next dev needs it); production drops it.
 * - connect-src opens exactly the configured backends: Supabase (REST + Realtime wss),
 *   PayPal SDK/API, Mapbox. Meta Model API is server-side only, never in the CSP.
 * - PayPal checkout renders iframes: frame-src is opened only when configured.
 */
function supabaseHosts(): string[] {
  const out: string[] = [];
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (url) {
      const host = new URL(url).host;
      out.push(`https://${host}`, `wss://${host}`);
    }
  } catch {
    /* ignore malformed URL */
  }
  return out;
}

function csp(): string {
  const paypal = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
  const connect = [
    "'self'",
    ...supabaseHosts(),
    ...(paypal ? ["https://www.paypal.com", "https://www.sandbox.paypal.com", "https://api-m.paypal.com", "https://api-m.sandbox.paypal.com"] : []),
    "https://api.mapbox.com",
    "https://events.mapbox.com",
  ];
  const script = ["'self'", "'unsafe-inline'", ...(isProd ? [] : ["'unsafe-eval'"])];
  // PayPal checkout renders its buttons in an iframe; allow it only when configured.
  const frameSrc = paypal ? "https://www.paypal.com https://www.sandbox.paypal.com" : "'none'";
  return [
    "default-src 'self'",
    `script-src ${script.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabaseHosts().filter((h) => h.startsWith("https")).join(" ")}`.trim(),
    "media-src 'self' data: blob:",
    `connect-src ${connect.join(" ")}`,
    `frame-src ${frameSrc}`,
    "frame-ancestors 'none'",
  ].join("; ");
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Content-Security-Policy", csp());
  res.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
  // U3: refresh the Supabase cookie session so magic-link users stay signed in.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anon) {
    const sb = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    });
    await sb.auth.getUser();
  }
  if (!req.cookies.get("tasklens:lang")) {
    const al = req.headers.get("accept-language") ?? "";
    res.cookies.set("tasklens:lang", al.toLowerCase().startsWith("es") ? "es" : "en", { path: "/", maxAge: 31536000 });
  }
  return res;
}

export const config = { matcher: "/:path*" };
