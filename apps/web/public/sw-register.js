/* TaskLens: the layout includes this script in production only (F2.6), so the
   worker never caches /_next chunks while developing. If you previously ran
   the production build locally, unregister the old worker once: Chrome
   DevTools → Application → Service workers → Unregister, then hard reload. */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support unavailable — the app still works online */
    });
  });
}
