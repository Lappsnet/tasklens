"use client";

/* U4 chrome mount: header + footer on marketing, bare on auth/dev,
   AppShell (sidebar + tab bar) everywhere else. */

import { usePathname } from "next/navigation";
import AppShell from "@/components/app/AppShell";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

const MARKETING = ["/", "/privacy", "/terms"];
const BARE_PREFIXES = ["/login", "/signup", "/connect-glasses", "/dev", "/auth/"];

function isMarketing(path: string): boolean {
  if (MARKETING.includes(path)) return true;
  return path.startsWith("/funciones/") || ["/profesionales", "/empresas", "/alcaldias"].includes(path);
}

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "/";
  if (isMarketing(path)) {
    return (
      <>
        <SiteHeader />
        <div className="mx-auto w-full max-w-[1280px] px-4">{children}</div>
        <SiteFooter />
      </>
    );
  }
  if (BARE_PREFIXES.some((p) => path === p || path.startsWith(p))) return <>{children}</>;
  return <AppShell>{children}</AppShell>;
}
