const CACHE = 'hostelqr-v1';
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'assets/icon-192.png',
  'assets/icon-512.png',
  // optional: falls vorhanden, Kamera offline
  'vendor/jsQR.min.js'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});

self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE?null:caches.delete(k)))));
});

self.addEventListener('fetch', e=>{
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
