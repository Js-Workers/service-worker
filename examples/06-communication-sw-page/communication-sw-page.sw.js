// to debug SW you can use chrome://inspect/#service-workers

console.error('SW communication-sw-page.sw example');

self.addEventListener('message', event => {
  console.error('event', event);

  // you can get access to the current client via clients.matchAll.then(clientsList => ...postMessage to some client )
  event.source.postMessage("Hello! Your message was: " + event.data);
});
