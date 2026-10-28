// Service worker minimale: l'app web funziona anche offline dopo la prima visita.
// Pagina principale: prima la rete (così gli aggiornamenti arrivano subito), poi la copia salvata.
// File statici (script, font, icone, pdf.js): prima la copia salvata. Le chiamate al server (/c/...) non vengono toccate.
const CACHE = "dungeon-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname === "/c" || url.pathname.startsWith("/c/") || url.pathname === "/health") return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const isPage = req.mode === "navigate" || url.pathname === "/" || url.pathname.endsWith(".html");
    if (isPage) {
      try {
        const res = await fetch(req);
        if (res.ok) cache.put("/", res.clone());
        return res;
      } catch {
        return (await cache.match("/")) || Response.error();
      }
    }
    const hit = await cache.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  })());
});
