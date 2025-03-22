// Este archivo debe ubicarse en la raíz de tu sitio web (/)

// Importa el Service Worker de OneSignal
importScripts('https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js');

// Aquí puedes añadir cualquier código adicional para tu Service Worker existente

// Por ejemplo, si tienes código para cachear tu PWA
const CACHE_NAME = 'Rodama-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Estrategia de cache primero, luego red
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Devuelve la respuesta cacheada si existe
        if (response) {
          return response;
        }
        
        // Si no, haz un fetch y cachea la respuesta
        return fetch(event.request).then(
          response => {
            // Verifica que sea una respuesta válida
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clona la respuesta para poder cachearla y devolverla
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          }
        );
      })
  );
});
