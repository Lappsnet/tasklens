import type { Metadata } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui";
import SiteChrome from "@/components/site/SiteChrome";
import "./styles/tokens.css";
import "./globals.css";

// Self-hosted per UI_UX_PROMPT.md (Fontshare: Cabinet Grotesk + General Sans,
// commercial use permitted; JetBrains Mono: SIL OFL 1.1). Preload display 800 + body 400/600.
const display = localFont({
  src: [
    { path: "../public/fonts/cabinet-grotesk-700.woff2", weight: "700" },
    { path: "../public/fonts/cabinet-grotesk-800.woff2", weight: "800" },
  ],
  variable: "--font-display",
  display: "swap",
  preload: true,
});
const body = localFont({
  src: [
    { path: "../public/fonts/general-sans-400.woff2", weight: "400" },
    { path: "../public/fonts/general-sans-500.woff2", weight: "500" },
    { path: "../public/fonts/general-sans-600.woff2", weight: "600" },
  ],
  variable: "--font-body",
  display: "swap",
  preload: true,
});
const mono = localFont({
  src: [
    { path: "../public/fonts/jetbrains-mono-400.woff2", weight: "400" },
    { path: "../public/fonts/jetbrains-mono-600.woff2", weight: "600" },
  ],
  variable: "--font-mono",
  display: "swap",
});

// System default theme, persisted override, no FOUC (runs before paint).
const themeInit = `(function(){try{var t=localStorage.getItem("tasklens:theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.dataset.theme=t;}catch(e){}})();`;

export const metadata: Metadata = {
  title: "TaskLens — Look, speak, book a pro",
  description: "Scope a home repair by looking at it. AI quote, matched pro, escrowed payment.",
  manifest: "/manifest.webmanifest",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://tasklens.app"),
  alternates: { languages: { es: "/", en: "/?lang=en" } },
  openGraph: {
    title: "TaskLens — Tu reparación, cotizada en segundos",
    description: "Mira · Habla · Firma · Verifica. Pago protegido hasta verificación.",
    images: ["/opengraph-image"],
  },
};

export const viewport = {
  themeColor: "#0F1B2D",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body
        className={`${display.variable} ${body.variable} ${mono.variable} min-h-screen bg-bg font-body text-ink antialiased`}
      >
        <SiteChrome>{children}</SiteChrome>
        <Toaster />
        <Script src="/sw-register.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
