"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { browserAuth, hasSupabaseBrowser } from "@/lib/auth-client";

/* PKCE recovery net: magic-link / confirmation emails are built from Supabase's
   Site URL. If that is still localhost (or any stale value) the email link lands
   on the wrong page with `?code=` instead of `/auth/callback`, and the login
   silently dies. Mounted once in the root layout, this exchanges the code
   wherever it lands and routes to /signup; expired/used links go to /login. */
export default function AuthCodeCatcher() {
  const router = useRouter();
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const code = q.get("code");
    if (!q.get("code") && !q.get("error")) return;
    if (q.get("error") || !code || !hasSupabaseBrowser()) {
      if (q.get("code") || q.get("error")) router.replace("/login?error=link");
      return;
    }
    browserAuth().auth.exchangeCodeForSession(code).then(({ error }) => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("code");
        window.history.replaceState({}, "", url.toString());
      } catch {
        /* ignore */
      }
      router.replace(error ? "/login?error=link" : "/signup");
    });
  }, [router]);
  return null;
}
