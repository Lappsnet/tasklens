import { GridBackdrop, Viewfinder } from "@/components/blueprint";
import { SHOWCASE_JOBS } from "@/content/showcase";

/* V5 (auth) layout: split screen. Left = form (480px max). Right (desktop) =
   dark blueprint panel with a real job photo inside The Lens: SAM-style mask,
   annotation callouts and a one-line quote of what TaskLens does. */

const PHOTO = SHOWCASE_JOBS.find((j) => j.id === "tomacorriente-derretido") ?? SHOWCASE_JOBS[0];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-76px)] lg:grid-cols-2">
      <div className="mx-auto flex w-full max-w-[480px] flex-col justify-center px-4 py-8 sm:px-6">{children}</div>
      <div className="relative hidden overflow-hidden bg-[#081120] lg:block" aria-hidden="true">
        <GridBackdrop dark className="absolute inset-0" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-12">
          <Viewfinder animate className="w-full max-w-md border border-[var(--grid-line)]">
            <div className="relative aspect-[4/3] bg-[#0A1220]">
              <picture>
                <source srcSet={PHOTO.image.avif} type="image/avif" />
                <img
                  src={PHOTO.image.src}
                  width={PHOTO.image.width}
                  height={PHOTO.image.height}
                  alt=""
                  loading="eager"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ backgroundImage: `url(${PHOTO.image.blur})`, backgroundSize: "cover" }}
                />
              </picture>
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: "linear-gradient(rgba(255,122,46,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,122,46,0.14) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                  clipPath: "circle(110px at 68% 62%)",
                }}
              />
              <div className="absolute left-[55%] top-[45%] h-[30%] w-[26%] rounded-[45%] border-2 border-[var(--signal)] bg-[rgba(255,122,46,0.25)] shadow-[0_0_24px_rgba(255,122,46,0.6)]" />
              <div className="absolute left-[30%] top-[30%] flex items-center gap-0">
                <span className="h-2 w-2 rounded-full bg-[var(--signal)] shadow-[0_0_10px_var(--signal)]" />
                <span className="h-px w-10 bg-[var(--signal)]" />
                <span className="whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white">Tomacorriente derretido</span>
              </div>
              <div className="absolute bottom-[22%] right-[16%] flex items-center gap-0">
                <span className="whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white">$120–220 · 1.5 h</span>
                <span className="h-px w-10 bg-[var(--signal)]" />
                <span className="h-2 w-2 rounded-full bg-[var(--signal)] shadow-[0_0_10px_var(--signal)]" />
              </div>
            </div>
          </Viewfinder>
          <p className="max-w-md text-center text-sm leading-relaxed text-white/70">
            Mira el problema con tus lentes Meta o tu celular y recibe la cotización en segundos.
          </p>
          <p className="font-mono text-xs uppercase tracking-widest text-white/50">Mira · Habla · Firma · Verifica</p>
        </div>
      </div>
    </div>
  );
}
