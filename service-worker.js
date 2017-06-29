console.error('hello from SW');
console.error('self', self);

const RESOURCES = [
  '/js/app.js',
  '/css/styles.css'
];

const sw = {
  initialize() {
    self.addEventListener('install', this.onInstall);
    self.addEventListener('activate', this.onActivate);
    self.addEventListener('fetch', this.onFetch);
  },
  onInstall(event) {
    console.error('install', event);
    console.error('this', this);

    event.waitUntil(
      caches.open('v1')
        .then(cache => cache.addAll(RESOURCES))
        .catch(err => console.error(err))
    );
  },
  onActivate(e) {
    console.error('activate', e);
  },
  isApiCall(host) {
    return host === 'api.themoviedb.org';
  },
  onFetchOld(event) {
    console.error('fetch', event);
    console.error('event.request', event.request);
    console.error('event.request.url', event.request.url);
    console.error('event.request.method', event.request.method);
    console.error('event.request.headers', event.request.headers);

    const requestUrl = new URL(event.request.url);

    if (sw.isApiCall(requestUrl.host)) {
      return event.respondWith(constructResponse());
    }
  },
  onFetch(event) {
    const {request} = event;
    const requestUrl = new URL(request.url);

    if (requestUrl.hostname === '') {
      event.respondWith(someAPIResponse(request));
    }
    // else if () {
      // TODO: implement images caching (someImgResponse)
    // }
    else {
      event.respondWith(
        caches.match(request)
        .catch(() => {
          return event.default();
        })
        .catch(() => {
          return caches.match('/fallback.html');
        })
      )
    }

    function someAPIResponse(request) {
      if (request.headers.has('x-use-cache')) {
        return caches.match(request);
      } else {
        caches.delete('content')
          .then(() => {
            return caches.create('content');
          })
          .then(contentCache => {
            contentCache.add(request);

            return fetch(request)
          })
      }
    }
  }
};

function constructResponse() {
  const data = JSON.stringify({serviceWorker: 'ok'});

  const responseInit = {
    // status/statusText default to 200/OK, but we're explicitly setting them here.
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': 'application/json',
      // Purely optional, but we return a custom response header indicating that this is a
      // mock response. The controlled page could check for this header if it wanted to.
      'X-Mock-Response': 'yes'
    }
  };

  return new Response(data, responseInit)
}

sw.initialize();
