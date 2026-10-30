"use client";

/* U2 nav config: pure data so tests can assert every link is a live route.
   Mega-menu features link to real pages or real landing anchors (U6 deep
   pages will replace the anchors). */

import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import type { Icon } from "@phosphor-icons/react";
import {
  Bank,
  Buildings,
  CalendarCheck,
  CurrencyDollar,
  FileText,
  Gear,
  Globe,
  GridFour,
  Headset,
  House,
  MapTrifold,
  PaperPlaneTilt,
  Play,
  Plus,
  Receipt,
  Scan,
  Scales,
  ShieldCheck,
  ClipboardText,
  BookBookmark,
  Briefcase,
  Users,
  SunHorizon,
  ArrowCounterClockwise,
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
    { slug: "escaneo", href: "/funciones/escaneo", icon: Scan, name: s.featScan, desc: s.featScanD },
    { slug: "contratos", href: "/funciones/contratos", icon: FileText, name: s.featContracts, desc: s.featContractsD },
    { slug: "calendario", href: "/funciones/calendario", icon: CalendarCheck, name: s.featCalendar, desc: s.featCalendarD },
    { slug: "pago", href: "/funciones/pago", icon: ShieldCheck, name: s.featEscrow, desc: s.featEscrowD },
    { slug: "pasaporte", href: "/funciones/pasaporte", icon: House, name: s.featPassport, desc: s.featPassportD },
    { slug: "planificador", href: "/funciones/planificador", icon: MapTrifold, name: s.featPlanner, desc: s.featPlannerD },
    { slug: "extranjero", href: "/funciones/extranjero", icon: Globe, name: s.featAbroad, desc: s.featAbroadD },
    { slug: "mediacion", href: "/funciones/mediacion", icon: Scales, name: s.featMediation, desc: s.featMediationD },
    { slug: "copiloto", href: "/funciones/copiloto", icon: Headset, name: s.featCopilot, desc: s.featCopilotD },
    { slug: "verificacion", href: "/funciones/verificacion", icon: Receipt, name: s.featVerify, desc: s.featVerifyD },
    { slug: "alcaldias", href: "/funciones/alcaldias", icon: Buildings, name: s.featCities, desc: s.featCitiesD },
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

export interface AppTab {
  href: string;
  label: string;
  icon: Icon;
  mobile: boolean;
}

export interface RoleMenu {
  tabs: AppTab[];
  center: { href: string; label: string; icon: Icon } | null;
}

/** U4 role menus. Only live routes — every href must resolve. */
export function roleMenu(role: string, lang: Lang): RoleMenu {
  const es = lang === "es";
  switch (role) {
    case "pro":
      return {
        tabs: [
          { href: "/pro", label: es ? "Hoy" : "Today", icon: SunHorizon, mobile: true },
          { href: "/pro/calendar", label: es ? "Calendario" : "Calendar", icon: CalendarCheck, mobile: true },
          { href: "/pro", label: es ? "Ganancias" : "Earnings", icon: CurrencyDollar, mobile: false },
          { href: "/pro", label: es ? "Trabajos" : "Jobs", icon: Briefcase, mobile: true },
          { href: "/scan", label: t(lang).featScan, icon: Scan, mobile: false },
          { href: "/ajustes", label: es ? "Ajustes" : "Settings", icon: Gear, mobile: false },
        ],
        center: { href: "/pro", label: es ? "Iniciar trabajo" : "Start job", icon: Play },
      };
    case "company":
      return {
        tabs: [
          { href: "/empresa", label: es ? "Panel" : "Board", icon: GridFour, mobile: true },
          { href: "/empresa/equipo", label: es ? "Equipo" : "Team", icon: Users, mobile: true },
          { href: "/pro/calendar", label: es ? "Calendario" : "Calendar", icon: CalendarCheck, mobile: true },
          { href: "/scan", label: t(lang).featScan, icon: Scan, mobile: false },
          { href: "/ajustes", label: es ? "Ajustes" : "Settings", icon: Gear, mobile: false },
        ],
        center: { href: "/empresa", label: es ? "Asignar" : "Assign", icon: Plus },
      };
    case "city_operator":
      return {
        tabs: [
          { href: "/city", label: es ? "Tablero" : "Board", icon: Buildings, mobile: true },
          { href: "/city", label: es ? "Reportes" : "Reports", icon: ClipboardText, mobile: true },
          { href: "/ajustes", label: es ? "Ajustes" : "Settings", icon: Gear, mobile: false },
        ],
        center: { href: "/city", label: es ? "Despachar" : "Dispatch", icon: PaperPlaneTilt },
      };
    case "admin":
      return {
        tabs: [
          { href: "/admin/pros", label: es ? "Verificaciones" : "Reviews", icon: ShieldCheck, mobile: true },
          { href: "/admin", label: "Demo reset", icon: ArrowCounterClockwise, mobile: true },
          { href: "/city", label: es ? "Tablero" : "Board", icon: Buildings, mobile: true },
          { href: "/ajustes", label: es ? "Ajustes" : "Settings", icon: Gear, mobile: false },
        ],
        center: null,
      };
    default:
      return {
        tabs: [
          { href: "/inicio", label: es ? "Inicio" : "Home", icon: House, mobile: true },
          { href: "/jobs", label: es ? "Mis trabajos" : "My jobs", icon: ClipboardText, mobile: true },
          { href: "/passport", label: t(lang).featPassport, icon: BookBookmark, mobile: true },
          { href: "/projects/new", label: es ? "Proyectos" : "Projects", icon: MapTrifold, mobile: false },
          { href: "/city", label: es ? "Ciudad" : "City", icon: Buildings, mobile: false },
          { href: "/ajustes", label: es ? "Ajustes" : "Settings", icon: Gear, mobile: false },
        ],
        center: { href: "/scan", label: es ? "Escanear" : "Scan", icon: Scan },
      };
  }
}
