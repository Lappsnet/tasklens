import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TaskLens — Look, speak, book a pro",
  description: "Scope a home repair by looking at it. AI quote, matched pro, escrowed payment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        <div className="mx-auto max-w-md px-4 pb-16 pt-6 sm:max-w-2xl">{children}</div>
      </body>
    </html>
  );
}
