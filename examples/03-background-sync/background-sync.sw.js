// to debug SW you can use chrome://inspect/#service-workers

console.error('SW background-sync example');

self.addEventListener('install', event => {
  console.error('install', event);

  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.error('activate', event);

  if (self.clients && clients.claim) {
    clients.claim();
  }
});

self.addEventListener('sync', function (event) {
  if (event.tag === 'some-fetch') {
    event.waitUntil(fetch('https://jsonplaceholder.typicode.com/post/1'));
  }
});
