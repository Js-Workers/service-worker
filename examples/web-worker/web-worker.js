self.addEventListener('message', event => {
  setTimeout(() => {
    postMessage(event.data);
  }, 2000);
});
