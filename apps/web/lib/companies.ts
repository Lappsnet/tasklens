import { randomUUID } from "node:crypto";
import { hasSupabase, serviceClient } from "./supabase-server";

export type MemberRole = "owner" | "dispatcher" | "member";

export interface Company {
  id: string;
  ownerId: string | null;
  name: string;
  zone: string;
  createdAt: number;
}

export interface CompanyMember {
  id: string;
  companyId: string;
  proId: string;
  proName?: string;
  role: MemberRole;
}

const gs = globalThis as unknown as {
  __tasklens_companies?: Map<string, Company>;
  __tasklens_members?: Map<string, CompanyMember>;
};
const companies = (gs.__tasklens_companies ??= new Map<string, Company>());
const members = (gs.__tasklens_members ??= new Map<string, CompanyMember>());

/** Test helper. */
export function __clearCompanies(): void {
  companies.clear();
  members.clear();
}

function rowFromDbCompany(r: unknown): Company {
  const x = r as Record<string, unknown>;
  return {
    id: String(x.id),
    ownerId: (x.owner_id as string) ?? null,
    name: String(x.name ?? ""),
    zone: String(x.zone ?? ""),
    createdAt: x.created_at ? Date.parse(String(x.created_at)) : Date.now(),
  };
}

/** All companies the user belongs to (owner or via a linked pro row). */
export async function myCompanies(userId: string): Promise<{ company: Company; role: MemberRole; proId: string | null }[]> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data: pros } = await db.from("pros").select("id").eq("user_id", userId);
        const proIds = ((pros as { id: string }[] | null) ?? []).map((p) => p.id);
        // Two reads (owner + member), merged — keeps the query RLS-friendly.
        const [{ data: owned }, { data: mems }] = await Promise.all([
          db.from("companies").select("*").eq("owner_id", userId),
          proIds.length > 0
            ? db.from("company_members").select("company_id, pro_id, role, companies(*)").in("pro_id", proIds)
            : Promise.resolve({ data: [] as unknown[] }),
        ]);
        const out: { company: Company; role: MemberRole; proId: string | null }[] = [];
        for (const c of ((owned as unknown[] | null) ?? [])) {
          out.push({ company: rowFromDbCompany(c), role: "owner", proId: null });
        }
        for (const m of ((mems as unknown[] | null) ?? [])) {
          const x = m as Record<string, unknown>;
          const c = (x.companies ?? x) as unknown;
          out.push({
            company: rowFromDbCompany(c),
            role: (x.role as MemberRole) ?? "member",
            proId: String(x.pro_id ?? ""),
          });
        }
        return out;
      }
    } catch (e) {
      console.error("[companies] list error:", e instanceof Error ? e.message : e);
    }
  }
  // Memory mode: ownership only (demo flow is single-owner; member->user
  // resolution needs linked pro rows, which only exist in Supabase).
  return [...companies.values()]
    .filter((c) => c.ownerId === userId)
    .map((company) => ({ company, role: "owner" as MemberRole, proId: null as string | null }));
}

export async function createCompany(ownerId: string, name: string, zone: string): Promise<Company> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data, error } = await db.from("companies").insert({ owner_id: ownerId, name, zone }).select("*").single();
        if (!error && data) return rowFromDbCompany(data);
        console.error("[companies] insert failed:", error?.message);
      }
    } catch (e) {
      console.error("[companies] error:", e instanceof Error ? e.message : e);
    }
  }
  const c: Company = { id: randomUUID(), ownerId, name, zone, createdAt: Date.now() };
  companies.set(c.id, c);
  return c;
}

export async function listMembers(companyId: string): Promise<CompanyMember[]> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data, error } = await db.from("company_members").select("*, pros(name)").eq("company_id", companyId);
        if (!error && data) {
          return (data as unknown[]).map((r) => {
            const x = r as Record<string, unknown>;
            const pro = x.pros as { name?: string } | null;
            return { id: String(x.id), companyId: String(x.company_id), proId: String(x.pro_id), proName: pro?.name, role: (x.role as MemberRole) ?? "member" };
          });
        }
      }
    } catch (e) {
      console.error("[companies] members error:", e instanceof Error ? e.message : e);
    }
  }
  return [...members.values()].filter((m) => m.companyId === companyId);
}

export async function addMember(companyId: string, proId: string, role: MemberRole): Promise<CompanyMember | null> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data: pro } = await db.from("pros").select("id").eq("id", proId).single();
        if (!pro) return null;
        const { data, error } = await db
          .from("company_members")
          .upsert({ company_id: companyId, pro_id: proId, role }, { onConflict: "company_id,pro_id" })
          .select("*")
          .single();
        if (!error && data) {
          const x = data as Record<string, unknown>;
          return { id: String(x.id), companyId: String(x.company_id), proId: String(x.pro_id), role: (x.role as MemberRole) ?? role };
        }
        console.error("[companies] addMember failed:", error?.message);
        return null;
      }
    } catch (e) {
      console.error("[companies] addMember error:", e instanceof Error ? e.message : e);
      return null;
    }
  }
  // Memory mode: accept pro_<id> handles (demo pool) or raw ids.
  const m: CompanyMember = { id: randomUUID(), companyId, proId, role };
  members.set(m.id, m);
  return m;
}

/** True when the user may dispatch for this company (owner, dispatcher, admin). */
export async function canDispatch(userId: string, isAdmin: boolean, companyId: string): Promise<boolean> {
  if (isAdmin) return true;
  const mine = await myCompanies(userId);
  return mine.some((m) => m.company.id === companyId && (m.role === "owner" || m.role === "dispatcher"));
}
