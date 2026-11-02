/* Server-safe classnames (no "use client"): clsx + tailwind-merge so
   overrides always win. Import from here in server components. */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...parts: ClassValue[]): string {
  return twMerge(clsx(...parts));
}
