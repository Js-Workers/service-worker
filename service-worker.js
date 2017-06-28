console.error('hello from SW');
console.error('self', self);

const sw = {
  initialize() {
    self.addEventListener('install', this.onInstall);
    self.addEventListener('activate', this.onActivate);
    self.addEventListener('fetch', this.onFetch);
  },
  onInstall(e) {
    console.error('install', e);
  },
  onActivate(e) {
    console.error('activate', e);
  },
  isApiCall() {
    // TODO: implement this method
    return true;
  },
  onFetch(e) {
    console.error('fetch', e);
    console.error('e.request', e.request);
    console.error('e.request.url', e.request.url);
    console.error('e.request.method', e.request.method);
    console.error('e.request.headers', e.request.headers);

    if (e.request.url === 'http://localhost:3000/api') {
      return e.respondWith(constructResponse());
    }
  }
};

function constructResponse() {
  // TODO: replace foo:bar object by mocked data
  const data = JSON.stringify({foo: 'bar'});
  const blob = new Blob([data]);

  return new Response(blob)
}

sw.initialize();
