const CACHE_NAME = 'rodama-rewards-pwa-cache-v3';
const STATIC_CACHE_NAME = 'rodama-static-cache-v3';
const DYNAMIC_CACHE_NAME = 'rodama-dynamic-cache-v3';
const SESSION_CACHE_NAME = 'rodama-session-cache-v1';

// Recursos estáticos a cachear
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192x192.png',
    '/icon-512x512.png'
];

// Lista de URLs que no deben ser cacheadas
const noCacheUrls = [
    'supabase.co',
    'supabase.in',
    'api.supabase.co',
    'auth/v1',
    'rest/v1'
];

// Función para verificar si una URL debe ser excluida del caché
function shouldExcludeFromCache(url) {
    return noCacheUrls.some(noCacheUrl => url.includes(noCacheUrl));
}

// Evento de instalación
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Instalando...');
    
    event.waitUntil(
        Promise.all([
            // Cache estático
            caches.open(STATIC_CACHE_NAME)
                .then((cache) => {
                    console.log('[Service Worker] Caching app shell');
                    return cache.addAll(urlsToCache);
                }),
            
            // Cache para sesiones (para asegurar que esté disponible)
            caches.open(SESSION_CACHE_NAME)
                .then((cache) => {
                    console.log('[Service Worker] Creando cache de sesiones');
                    return cache;
                })
        ])
        .then(() => {
            console.log('[ServiceWorker] Instalación completada');
            return self.skipWaiting();
        })
    );
});

// Evento de activación
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activando...');
    
    const cacheWhitelist = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME, SESSION_CACHE_NAME];
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('[ServiceWorker] Eliminando cache obsoleto:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => {
            console.log('[ServiceWorker] Claiming clients');
            return self.clients.claim();
        })
    );
});

// Evento de fetch
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Ignorar las peticiones chrome-extension
    if (url.protocol === 'chrome-extension:') {
        return;
    }
    
    // No cachear peticiones a Supabase Auth o API
    if (shouldExcludeFromCache(request.url)) {
        console.log('[ServiceWorker] Omitiendo caché para:', request.url);
        
        // Estrategia "network-only" para APIs de Supabase
        event.respondWith(
            fetch(request)
                .catch((error) => {
                    console.error('[ServiceWorker] Error en petición de autenticación:', error);
                    // Aquí podríamos devolver una respuesta específica para errores de autenticación
                    return new Response(JSON.stringify({ 
                        error: 'offline',
                        message: 'Necesitas conexión a internet para esta acción'
                    }), {
                        headers: { 'Content-Type': 'application/json' },
                        status: 503
                    });
                })
        );
        return;
    }
    
    // Estrategia "stale-while-revalidate" para otros recursos
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                // Intentar devolver la versión cacheada primero
                const fetchPromise = fetch(request)
                    .then((networkResponse) => {
                        // Si la respuesta es válida, actualizar el caché
                        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                            const responseToCache = networkResponse.clone();
                            caches.open(DYNAMIC_CACHE_NAME)
                                .then((cache) => {
                                    cache.put(request, responseToCache);
                                });
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        console.log('[ServiceWorker] Fallback a caché o error para:', request.url);
                        // Si estamos offline y no hay caché, podríamos devolver una página offline
                        if (request.mode === 'navigate') {
                            // Para navegación, intenta devolver la página principal cacheada
                            return caches.match('/rodama-rewards/');
                        }
                        return null;
                    });
                
                return cachedResponse || fetchPromise;
            })
    );
});

// Sincronización en segundo plano (para cuando la app vuelve a estar online)
self.addEventListener('sync', (event) => {
    if (event.tag === 'supabase-auth-sync') {
        console.log('[ServiceWorker] Sincronizando autenticación en segundo plano');
        // Aquí podríamos implementar lógica para renovar tokens o verificar sesiones
    }
});

// Manejo de mensajes desde el cliente
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    // Podrías añadir más manejo de mensajes aquí
});
