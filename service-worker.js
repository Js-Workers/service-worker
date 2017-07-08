self.importScripts('./node_modules/idb-keyval/idb-keyval.js');
// self.importScripts('./node_modules/idb/lib/idb.js');

console.error('idbKeyval', idbKeyval);
// console.error('idb', idb);

const CACHE_VERSION = 'v1';
const RESOURCES = [
  '/',
  'index.html',
  '/js/app.js',
  '/css/styles.css',
  '/utils/carousel/carousel.css',
  '/utils/carousel/carousel.js',
  '/node_modules/idb-keyval/idb-keyval.js',
  // './node_modules/idb/lib/idb.js',
  'https://fonts.gstatic.com/s/materialicons/v22/2fcrYFNaTjcS6g4U3t-Y5ZjZjT5FdEJ140U2DJYC3mY.woff2'
];

const sw = {
  initialize() {
    console.error('initialize');
    self.addEventListener('install', sw.onInstall);
    self.addEventListener('activate', sw.onActivate);
    self.addEventListener('fetch', sw.onFetch);
    self.addEventListener('sync', sw.onSync);
    self.addEventListener('message', sw.oMessage);
  },
  onSync(event) {
    if (event.tag === 'some-fetch') {
      event.waitUntil(Promise.reject());
    }
  },
  oMessage(event) {
    const {data} = event;
    const {id} = data;
    const IMG_DOMAIN = 'https://image.tmdb.org/t/p/w300';
    const MOVIE_DOMAIN = 'https://www.themoviedb.org/movie/';

    idbKeyval.set(id, data).then(() => {
      idbKeyval.get(id).then(movie => {

        console.error('movie', movie);
        const {title, overview, poster_path, rate} = movie;

        if (rate === 'like') {
          self.registration.showNotification(`${rate} ${title}`,{
            body: overview,
            icon: `${IMG_DOMAIN}${poster_path}`,
            data: `${MOVIE_DOMAIN}${id}`
          });

          // sendResponse
          event.source.postMessage({movie});
        }
      });
    });
  },
  onInstall(event) {
    console.error('install', event);

    event.waitUntil(
      caches.open(CACHE_VERSION).then(cache => cache.addAll(RESOURCES))
    );
  },
  onActivate(event) {
    console.error('activate', event);

    event.waitUntil(
      caches.open(CACHE_VERSION)
        .then(cache => cache.keys())
        .then(keys => {
          // keys.forEach(key => console.log(key));
          sw.deleteCache(keys);
        })
        .then(() => self.clients.claim())
    );
  },
  deleteCache(names) {
    return Promise.all(
      names
        .filter(cacheName => cacheName !== CACHE_VERSION)
        .map(cacheName => caches.delete(cacheName))
    );
  },
  isApiCall(host) {
    return host === 'api.themoviedb.org';
  },
  isImgCall(host) {
    return host === 'image.tmdb.org';
  },
  onFetch(event) {
    const {host} = new URL(event.request.url);

    if (sw.isApiCall(host)) {
      event.respondWith(
        caches.match(event.request)
          .then(response => {
            if (response) return response;

            return fetch(event.request)
              .then(() => caches.open(CACHE_VERSION).then(cache => cache.add(event.request)))
              .catch(err => console.error('Fetch error', err));
          })
          .catch(err => {
            console.error('Caches match error', err);
          })
      );
    }
    else if (sw.isImgCall(host)) {
      console.error('isImgCall');

      event.respondWith(
        caches.match(event.request)
          .then(response => {
            if (response) return response;

            return fetch(event.request)
              .then(fetchResponse => caches.open(CACHE_VERSION).then(cache => {
                cache.put(event.request, fetchResponse.clone());

                return fetchResponse;
              }))
              .catch(err => console.error('Fetch error', err));
          })
          .catch(err => console.error('Caches match error', err)));
    }
    else {
      event.respondWith(caches.match(event.request));
    }
  }
};

sw.initialize();
