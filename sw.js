/* CotizaObra — service worker.
   La app se guarda en el equipo para funcionar sin internet.
   La página principal se busca primero en la red, así las actualizaciones
   entran solas cuando hay conexión, y se usa la copia guardada si no la hay. */
const VERSION = "cotizaobra-v3";
const BASICOS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./jspdf.umd.min.js",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", e=>{
  e.waitUntil(
    caches.open(VERSION)
      .then(c => Promise.all(BASICOS.map(u => c.add(u).catch(()=>null))))
      .then(()=> self.skipWaiting())
  );
});

self.addEventListener("activate", e=>{
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k))))
      .then(()=> self.clients.claim())
  );
});

self.addEventListener("fetch", e=>{
  const req = e.request;
  if (req.method !== "GET") return;

  const esPagina = req.mode === "navigate" || req.destination === "document";
  if (esPagina){
    e.respondWith(
      fetch(req).then(res=>{
        if (res && res.ok){
          const copia = res.clone();
          caches.open(VERSION).then(c=> c.put("./index.html", copia)).catch(()=>{});
        }
        return res;
      }).catch(()=>
        caches.match("./index.html").then(r => r || caches.match("./"))
      )
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit=>{
      if (hit) return hit;
      return fetch(req).then(res=>{
        if (res && (res.ok || res.type === "opaque")){
          const copia = res.clone();
          caches.open(VERSION).then(c=> c.put(req, copia)).catch(()=>{});
        }
        return res;
      }).catch(()=> new Response("", {status:504, statusText:"sin conexion"}));
    })
  );
});
