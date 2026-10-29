import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://tasklens.app";
  const pages = ["", "/scan", "/login", "/pro", "/passport", "/privacy", "/terms"];
  return pages.map((p) => ({ url: `${base}${p}`, lastModified: new Date(), changeFrequency: "weekly", priority: p === "" ? 1 : 0.7 }));
}
