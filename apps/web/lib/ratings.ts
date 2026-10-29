/** Demo-mode ratings (memory). Real mode uses the ratings table. */
const gs = globalThis as unknown as { __tasklens_ratings?: Map<string, { jobId: string; proId: string; stars: number }[]> };
const ratings = (gs.__tasklens_ratings ??= new Map<string, { jobId: string; proId: string; stars: number }[]>());

export function appendMemoryRating(r: { jobId: string; proId: string; stars: number }): void {
  const list = ratings.get(r.proId) ?? [];
  if (!list.some((x) => x.jobId === r.jobId)) list.push(r);
  ratings.set(r.proId, list);
}

export function getMemoryRatings(proId: string): { jobId: string; proId: string; stars: number }[] {
  return ratings.get(proId) ?? [];
}

export function proAverage(proId: string): number | null {
  const list = ratings.get(proId) ?? [];
  if (list.length === 0) return null;
  return Math.round((list.reduce((a, b) => a + b.stars, 0) / list.length) * 10) / 10;
}
