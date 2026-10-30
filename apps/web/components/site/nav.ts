"use client";

/* U2 nav config: pure data so tests can assert every link is a live route.
   Mega-menu features link to real pages or real landing anchors (U6 deep
   pages will replace the anchors). */

import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import type { Icon } from "@phosphor-icons/react";
import {
  Buildings,
  CalendarCheck,
  FileText,
  Globe,
  Headset,
  House,
  MapTrifold,
  Receipt,
  Scales,
  Scan,
  ShieldCheck,
} from "@phosphor-icons/react";

export interface FeatureLink {
  slug: string;
  href: string;
  icon: Icon;
  name: string;
  desc: string;
}

export function featureLinks(lang: Lang): FeatureLink[] {
  const s = t(lang);
  return [
    { slug: "escaneo", href: "/scan", icon: Scan, name: s.featScan, desc: s.featScanD },
    { slug: "cotizacion", href: "/scan", icon: Receipt, name: s.featQuote, desc: s.featQuoteD },
    { slug: "contratos", href: "/#faq", icon: FileText, name: s.featContracts, desc: s.featContractsD },
    { slug: "calendario", href: "/pro/calendar", icon: CalendarCheck, name: s.featCalendar, desc: s.featCalendarD },
    { slug: "pago", href: "/#confianza", icon: ShieldCheck, name: s.featEscrow, desc: s.featEscrowD },
    { slug: "pasaporte", href: "/passport", icon: House, name: s.featPassport, desc: s.featPassportD },
    { slug: "planificador", href: "/projects/new", icon: MapTrifold, name: s.featPlanner, desc: s.featPlannerD },
    { slug: "extranjero", href: "/#faq", icon: Globe, name: s.featAbroad, desc: s.featAbroadD },
    { slug: "mediacion", href: "/#faq", icon: Scales, name: s.featMediation, desc: s.featMediationD },
    { slug: "copiloto", href: "/pro", icon: Headset, name: s.featCopilot, desc: s.featCopilotD },
    { slug: "alcaldias", href: "/city", icon: Buildings, name: s.featCities, desc: s.featCitiesD },
  ];
}

export type RoleKey = "customer" | "pro" | "company" | "city_operator" | "admin";

export function roleLabel(role: string, lang: Lang): string {
  const s = t(lang);
  switch (role) {
    case "customer": return s.roleCustomer;
    case "pro": return s.rolePro;
    case "company": return s.roleCompany;
    case "city_operator": return s.roleCity;
    case "admin": return s.roleAdmin;
    default: return role;
  }
}

/** Home route per role (user menu + bell). */
export function roleHome(role: string): string {
  switch (role) {
    case "pro": return "/pro";
    case "company": return "/pro";
    case "city_operator": return "/city";
    case "admin": return "/admin";
    default: return "/";
  }
}

export interface RoleLink {
  href: string;
  label: string;
}

/** Quick links per role. Company reuses pro surfaces until U4/015. */
export function roleLinks(role: string, lang: Lang): RoleLink[] {
  const s = t(lang);
  switch (role) {
    case "pro":
    case "company":
      return [
        { href: "/pro", label: lang === "es" ? "Hoy" : "Today" },
        { href: "/pro/calendar", label: s.featCalendar },
        { href: "/scan", label: s.featScan },
      ];
    case "city_operator":
      return [{ href: "/city", label: lang === "es" ? "Tablero" : "Board" }];
    case "admin":
      return [
        { href: "/admin/pros", label: s.queueTitle },
        { href: "/admin", label: lang === "es" ? "Demo reset" : "Demo reset" },
        { href: "/city", label: lang === "es" ? "Tablero" : "Board" },
      ];
    default:
      return [
        { href: "/scan", label: s.featScan },
        { href: "/passport", label: s.featPassport },
        { href: "/city", label: lang === "es" ? "Tablero" : "Board" },
      ];
  }
}
