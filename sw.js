/* Static assets only. Sessions and Google Sheets responses are never cached. */
const CACHE='kasirrr-static-v2-20261031';
const ASSETS=['./','./index.html','./style.css','./config.js','./core.js','./app.js','./xlsx.js','./manifest.json','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n==='omnipos-cache-v1'||n.startsWith('kasirrr-static-')&&n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==self.location.origin||!ASSETS.some(p=>new URL(p,self.registration.scope).href===u.href))return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)))}return r}).catch(()=>caches.match(e.request)))});
