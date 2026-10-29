import { randomUUID } from "node:crypto";
import { hasSupabase, serviceClient } from "./supabase-server";
import type { ProjectPlan } from "@tasklens/ai";

export interface ProjectRow {
  id: string;
  customer_id?: string;
  title: string;
  video_note: string;
  plan?: ProjectPlan;
  status: string;
  createdAt: number;
}

export interface PhaseRow {
  id: string;
  project_id: string;
  trade: string;
  title: string;
  scope: string;
  est_days: number;
  budget_low_usd: number;
  budget_high_usd: number;
  materials: string[];
  job_id?: string;
  finish_pick?: string;
  status: string;
  seq: number;
}

const gs = globalThis as unknown as {
  __tasklens_projects?: Map<string, ProjectRow>;
  __tasklens_phases?: Map<string, PhaseRow[]>;
};
const projects = (gs.__tasklens_projects ??= new Map<string, ProjectRow>());
const phases = (gs.__tasklens_phases ??= new Map<string, PhaseRow[]>());

export async function saveProject(p: Omit<ProjectRow, "id" | "createdAt"> & { id?: string }): Promise<ProjectRow> {
  const row: ProjectRow = { ...p, id: p.id ?? randomUUID(), createdAt: Date.now() };
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data, error } = await db.from("projects").insert({ id: row.id, customer_id: null, title: row.title, video_note: row.video_note, plan: row.plan, status: row.status }).select("*").single();
        if (!error && data) return data as unknown as ProjectRow;
      }
    } catch (e) {
      console.error("[projects] save error:", e instanceof Error ? e.message : e);
    }
  }
  projects.set(row.id, row);
  return row;
}

export async function getProject(id: string): Promise<ProjectRow | null> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data } = await db.from("projects").select("*").eq("id", id).single();
        if (data) return data as unknown as ProjectRow;
      }
    } catch (e) {
      console.error("[projects] read error:", e instanceof Error ? e.message : e);
    }
  }
  return projects.get(id) ?? null;
}

export async function savePhases(projectId: string, list: Omit<PhaseRow, "id" | "project_id" | "seq">[]): Promise<PhaseRow[]> {
  const rows: PhaseRow[] = list.map((p, i) => ({ ...p, id: randomUUID(), project_id: projectId, seq: i }));
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data, error } = await db.from("project_phases").insert(rows.map(({ status, ...r }) => ({ ...r, status: status ?? "planned" }))).select("*");
        if (!error && data) return data as unknown as PhaseRow[];
        console.error("[projects] phases insert failed:", error?.message);
      }
    } catch (e) {
      console.error("[projects] phases error:", e instanceof Error ? e.message : e);
    }
  }
  phases.set(projectId, rows);
  return rows;
}

export async function listPhases(projectId: string): Promise<PhaseRow[]> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data } = await db.from("project_phases").select("*").eq("project_id", projectId).order("seq", { ascending: true });
        if (data) return data as unknown as PhaseRow[];
      }
    } catch (e) {
      console.error("[projects] phases read error:", e instanceof Error ? e.message : e);
    }
  }
  return [...(phases.get(projectId) ?? [])].sort((a, b) => a.seq - b.seq);
}

export async function updatePhase(projectId: string, phaseId: string, patch: Partial<PhaseRow>): Promise<PhaseRow | null> {
  if (hasSupabase()) {
    try {
      const db = serviceClient();
      if (db) {
        const { data } = await db.from("project_phases").update(patch).eq("id", phaseId).select("*").single();
        if (data) return data as unknown as PhaseRow;
      }
    } catch (e) {
      console.error("[projects] phase update error:", e instanceof Error ? e.message : e);
    }
  }
  const list = phases.get(projectId) ?? [];
  const row = list.find((p) => p.id === phaseId);
  if (!row) return null;
  Object.assign(row, patch);
  return row;
}
