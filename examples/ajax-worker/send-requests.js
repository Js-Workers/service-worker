function sendRequests(urls) {
  for(let i = 0; i < urls.length; i++) {
    const url = urls[i];

    const xhr = new XMLHttpRequest();  // Begin an HTTP request

    xhr.open('GET', url, false);       // false makes this synchronous
    xhr.send();                        // Blocks until response is complete
    if (xhr.status !== 200) {          // Throw an error if request failed
      throw Error(`${xhr.status} ${xhr.statusText} ${url}`);
    }
  }
}
