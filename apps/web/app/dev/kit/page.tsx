import { notFound } from "next/navigation";
import KitShowcase from "./showcase";

/** U1 component kit. Hidden in production (404) — dev/review only. */
export default function KitPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <KitShowcase />;
}
