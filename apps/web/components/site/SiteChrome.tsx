"use client";

/* U2 chrome mount: header + footer on marketing routes only.
   App routes get the U4 AppShell; /dev stays bare. */

import { usePathname } from "next/navigation";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

const MARKETING = ["/", "/privacy", "/terms"];
function isMarketing(path: string): boolean {
  if (MARKETING.includes(path)) return true;
  return path.startsWith("/funciones/") || ["/profesionales", "/empresas", "/alcaldias"].includes(path);
}

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "/";
  if (!isMarketing(path)) {
    // Interim container until the U4 AppShell brings sidebar + 1200px content.
    return <div className="mx-auto w-full max-w-md px-4 pb-16 pt-6 sm:max-w-2xl">{children}</div>;
  }
  return (
    <>
      <SiteHeader />
      <div className="mx-auto w-full max-w-[1280px] px-4">{children}</div>
      <SiteFooter />
    </>
  );
}
