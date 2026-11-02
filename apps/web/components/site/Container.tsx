import type { ReactNode } from "react";
import { cn } from "@/components/cn";

/* V0: single Container token used by header, footer and every landing section.
   Sections render full width; content always sits inside <Container/>. */
export default function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1240px] px-5 sm:px-8 lg:px-12", className)}>{children}</div>;
}

export function Section({
  children,
  tone = "light",
  className,
}: {
  children: ReactNode;
  tone?: "light" | "dark" | "paper";
  className?: string;
}) {
  const tones: Record<string, string> = {
    light: "bg-white text-ink",
    dark: "bg-[#0A1220] text-white",
    paper: "bg-bg text-ink",
  };
  return (
    <section className={cn(tones[tone], className)}>
      <Container>
        <div className="py-16 sm:py-20 lg:py-24">{children}</div>
      </Container>
    </section>
  );
}
