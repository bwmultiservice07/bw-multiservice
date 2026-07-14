// Service Worker de BW Multiservice — permet d'ouvrir l'application même
// sans AUCUNE connexion internet au départ (pas seulement après une première
// ouverture réussie).
//
// Stratégie "réseau prioritaire" : à chaque ouverture, on essaie d'abord de
// charger la toute dernière version en ligne (exactement comme aujourd'hui,
// sans service worker) ; ce n'est QUE si le réseau échoue (pas d'internet)
// qu'on sert la dernière version mise en cache. Ainsi, le flux de travail
// habituel (uploader index.html sur GitHub, l'utilisateur voit la mise à
// jour immédiatement dès qu'il a internet) n'est jamais affecté.
const CACHE_NAME = 'bw-multiservice-v2';
const APP_SHELL = './index.html';

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.add(APP_SHELL))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // On ne met en cache que la navigation vers la page principale — le reste
  // (Firebase, Google APIs...) continue de fonctionner normalement en ligne
  // et n'a pas besoin d'être mis en cache pour que l'app hors-ligne marche
  // (les données elles-mêmes sont déjà sauvegardées localement par l'app).
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          caches.open(CACHE_NAME).then(cache => cache.put(APP_SHELL, response.clone()));
          return response;
        })
        .catch(() => caches.match(APP_SHELL))
    );
  }
});
