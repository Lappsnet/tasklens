"use client";

/* Theme: system default, localStorage override, data-theme on <html>.
   The blocking init script in layout.tsx prevents a flash; this is the toggle. */

import { useEffect, useState } from "react";
import { Moon, Sun } from "@phosphor-icons/react";
import { IconButton } from "@/components/ui";

export type Theme = "light" | "dark";

export function getTheme(): Theme {
  if (typeof document !== "undefined") {
    const t = document.documentElement.dataset.theme;
    if (t === "light" || t === "dark") return t;
  }
  return "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    setTheme(getTheme());
  }, []);
  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("tasklens:theme", next);
    } catch {
      /* ignore */
    }
    setTheme(next);
  }
  return (
    <IconButton label={theme === "light" ? "Dark mode" : "Light mode"} onPress={toggle}>
      {theme === "light" ? <Moon aria-hidden="true" size={20} /> : <Sun aria-hidden="true" size={20} />}
    </IconButton>
  );
}
