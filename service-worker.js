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
  onFetch(e) {
    console.error('fetch', e);
    console.error('caches', caches)
  }
};

sw.initialize();

// self.addEventListener('install', event => {
//   console.error('install', event);
//
//   // All of these logging statements should be visible via the "Inspect" interface
//   // for the relevant SW accessed via chrome://serviceworker-internals
// });
//
// self.addEventListener('activate', event => {
//   console.error('activate', event);
// });
//
// self.addEventListener('fetch', event => {
//   console.error('fetch', event);
// });
