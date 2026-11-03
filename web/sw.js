// Pouze veřejná statická schránka. Odpovědi API a zákaznická data se necachují.
const CACHE='perfect-cloud-static-v1';
self.addEventListener('install',e=>{self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('perfect-cloud-static-')&&k!==CACHE)await caches.delete(k);await self.clients.claim();})()));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin)return;
 if(['/manifest.webmanifest','/icons/icon-192.png','/icons/icon-512.png'].includes(u.pathname))e.respondWith((async()=>{const c=await caches.open(CACHE),v=await c.match(e.request);if(v)return v;const r=await fetch(e.request);if(r.ok)await c.put(e.request,r.clone());return r;})());
});
