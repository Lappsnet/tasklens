"use client";

import { useEffect, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { initialLang } from "@/lib/lang";

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const saved = initialLang() ?? window.localStorage.getItem("tasklens:lang");
    if (saved === "en" || saved === "es") setLang(saved);
  }, []);
  const strings = t(lang);
  return (
    <main>
      <h1>TaskLens</h1>
      <p className="muted">{strings.homeSub}</p>
      <p>
        <a className="btn" href="/scan">{strings.startScan}</a>
      </p>
      <h2>{strings.coreLoopTitle}</h2>
      <ol className="steps">
        <li>{strings.loop1}</li>
        <li>{strings.loop2}</li>
        <li>{strings.loop3}</li>
        <li>{strings.loop4}</li>
      </ol>
      <p className="muted">{strings.apiNote} <code>/api/health</code></p>
    </main>
  );
}
