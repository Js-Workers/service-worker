self.addEventListener('install', event => {
  console.error('installed another SW', event);
});

self.addEventListener('activate', event => {
  console.log('activated', event);
});
