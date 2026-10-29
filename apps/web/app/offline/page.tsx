import Link from "next/link";

export const metadata = { title: "Sin conexión — TaskLens" };

/** P0-5 offline fallback: served by the service worker when the network fails. */
export default function OfflinePage() {
  return (
    <main>
      <h1 className="font-display text-2xl font-bold">Sin conexión / Offline</h1>
      <p className="mt-3 text-slate2">
        No hay conexión a internet. Tus datos están a salvo; vuelve a intentarlo cuando tengas
        señal. / No internet connection. Your data is safe; try again when you are back online.
      </p>
      <Link className="btn btn-accent mt-4" href="/">
        Reintentar / Retry
      </Link>
    </main>
  );
}
