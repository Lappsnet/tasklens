import type { ReactNode } from "react";
import { cn } from "@/components/ui";

/* F1.3: marketing sections are full width; content goes in <Container/>. */
export default function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}
