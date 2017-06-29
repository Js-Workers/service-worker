const btn = document.getElementById('btn');

const DOMAIN_URL = 'http://localhost:3000';
const api_key = '59ff214635b431c1656379bf5aa01a8a';

const externalApi = `https://api.themoviedb.org/3/movie/upcoming?api_key=${api_key}&language=en-US&page=1`;
const localApi = `${DOMAIN_URL}/api`;

btn.addEventListener('click', event => {
  console.error('click', event);


  // fetch(api)
  // .then(data => {
  //   console.error(data);
  //
  //   data.json().then(response => {
  //     console.error('response', response);
  //   })
  // })
  // .catch(err => console.error(err));

  makeApiRequest(externalApi);
});


function makeApiRequest(url, type = 'GET') {
  const xhr = new XMLHttpRequest();

  xhr.open(type, url);

  xhr.setRequestHeader('Content-Type', 'application/json');
  // Only set the custom 'X-Mock-Response' header if the box is checked. The service worker will
  // use the header's presence to determine whether to return a mock or genuine response.

  // xhr.setRequestHeader('X-Mock-Response', 'yes');

  xhr.addEventListener('load', function() {
    const response = JSON.parse(xhr.response);
    console.log('Response is', response);
  });

  const requestJson = JSON.stringify({xmlhttp: 'ok'});

  xhr.send(requestJson);
}


function riba () {
  let showingLiveData = false;

  const liveDataPromise = getPhotoData()
  .then(updatePage)
  .then(() => showingLiveData = true);

  const cacheDataPromise = getCachedPhotoData()
  .then(data => {
    if (!showingLiveData) {
      updatePage(data);
    }
  });

  liveDataPromise.catch(() => cacheDataPromise)
  .catch(showConnectionError)
  .then(hideSpinner);

  function getPhotoData() {
    return fetch('some api');
  }

  function getCachedPhotoData() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      return fetch('some api');
    } else {
      return Promise.reject('some error');
    }
  }
}
