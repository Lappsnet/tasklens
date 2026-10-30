import type { Metadata } from "next";
import Script from "next/script";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { Toaster } from "@/components/ui";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "TaskLens — Look, speak, book a pro",
  description: "Scope a home repair by looking at it. AI quote, matched pro, escrowed payment.",
  manifest: "/manifest.webmanifest",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://tasklens.app"),
  alternates: { languages: { es: "/", en: "/?lang=en" } },
  openGraph: {
    title: "TaskLens — Tu reparación, cotizada en segundos",
    description: "Mira · Habla · Reserva · Verifica. Pago protegido hasta verificación.",
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
    <html lang="es">
      <body className={`${display.variable} ${body.variable} min-h-screen bg-paper font-body text-ink antialiased`}>
        <div className="mx-auto w-full max-w-md px-4 pb-16 pt-6 sm:max-w-2xl">{children}</div>
        <Toaster />
        <Script src="/sw-register.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
