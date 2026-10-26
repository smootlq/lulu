/* Lulu service worker: cache-first, works fully offline after first visit. */
const VERSION='lulu-v1.0.0';
const ASSETS=['./','./index.html','./styles.css','./app.js','./questions.js','./manifest.webmanifest','./fonts/Cairo.ttf',
 './icons/apple-touch-icon.png','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET')return;
  const url=new URL(req.url); if(url.origin!==location.origin)return;
  e.respondWith(caches.match(req,{ignoreSearch:true}).then(hit=>{
    if(hit)return hit;
    return fetch(req).then(res=>{if(res&&res.ok){const copy=res.clone();caches.open(VERSION).then(c=>c.put(req,copy));}return res;})
      .catch(()=>req.mode==='navigate'?caches.match('./index.html'):Response.error());
  }));
});
