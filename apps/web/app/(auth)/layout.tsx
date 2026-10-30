import { GridBackdrop, Viewfinder } from "@/components/blueprint";

/**
 * U3 (auth) layout: split screen. Left = form, right (desktop) = dark
 * blueprint panel looping the current step (phone scanning / glasses POV).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-76px)] lg:grid-cols-2">
      <div className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-8">{children}</div>
      <div className="relative hidden overflow-hidden bg-[#081120] lg:block" aria-hidden="true">
        <GridBackdrop dark className="absolute inset-0" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-12">
          <Viewfinder animate className="w-full max-w-md border border-[var(--grid-line)]">
            <div className="relative aspect-[4/3] bg-[#0A1220]">
              <div className="scan-beam" />
              <div className="absolute left-[18%] top-[30%] flex items-center gap-0">
                <span className="h-2 w-2 rounded-full bg-[var(--signal)] shadow-[0_0_10px_var(--signal)]" />
                <span className="h-px w-10 bg-[var(--signal)]" />
                <span className="rounded bg-black/70 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white">Sifón corroído</span>
              </div>
              <div className="absolute bottom-[22%] right-[16%] flex items-center gap-0">
                <span className="rounded bg-black/70 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white">$120–220</span>
                <span className="h-px w-10 bg-[var(--signal)]" />
                <span className="h-2 w-2 rounded-full bg-[var(--signal)] shadow-[0_0_10px_var(--signal)]" />
              </div>
            </div>
          </Viewfinder>
          <p className="font-mono text-xs uppercase tracking-widest text-white/50">Mira · Habla · Firma · Verifica</p>
        </div>
      </div>
    </div>
  );
}
