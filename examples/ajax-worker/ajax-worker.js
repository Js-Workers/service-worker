importScripts('./send-requests.js');

onmessage = function(event) {
  const urls = event.data;

  sendRequests(urls);
};
