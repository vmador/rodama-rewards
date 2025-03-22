// Quitar código complejo para minimizar conflictos
importScripts('https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js');

// Agregar event listener para evitar errores de mensajes
self.addEventListener('message', function(event) {
  // Simplemente responde a los mensajes para evitar errores
  if (event.data && event.data.type) {
    self.clients.matchAll().then(function(clients) {
      clients.forEach(function(client) {
        client.postMessage({
          type: event.data.type + '_response',
          success: true
        });
      });
    });
  }
});
