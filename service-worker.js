const CACHE_VERSION = 'v1';
const RESOURCES = [
  '/',
  'index.html',
  '/js/app.js',
  '/css/styles.css',
  '/utils/carousel/carousel.css',
  '/utils/carousel/carousel.js'
];

const sw = {
  initialize() {
    self.addEventListener('install', this.onInstall);
    self.addEventListener('activate', this.onActivate);
    self.addEventListener('fetch', this.onFetch);
  },
  onInstall(event) {
    console.error('install', event);

    event.waitUntil(
      caches.open(CACHE_VERSION).then(cache => {
        return cache.addAll(RESOURCES);
      })
    );
  },
  onActivate(event) {
    console.error('activate', event);

    event.waitUntil(
      caches.open(CACHE_VERSION)
        .then(cache => cache.keys())
        .then(keys => {
          keys.forEach(key => console.log(key));
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

function constructResponse() {
  // TODO: replace foo:bar object by mocked data
  const data = JSON.stringify({foo: 'bar'});

  return new Response(data)
}

sw.initialize();
