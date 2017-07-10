self.importScripts('./node_modules/idb-keyval/idb-keyval.js');
self.importScripts('./js/endpoints.js');
self.importScripts('./js/config.js');

const CACHE_VERSION = 'v1';
const RESOURCES = [
  '/',
  'index.html',
  '/js/app.js',
  '/js/config.js',
  '/js/endpoints.js',
  '/css/styles.css',
  '/img/dislike.svg',
  '/img/like.svg',
  '/utils/carousel/carousel.css',
  '/utils/carousel/carousel.js',
  '/node_modules/idb-keyval/idb-keyval.js'
];

const logger = {
  error(...args) {
    console.error(...args);
  },
  success(...args) {
    console.log(`%c${args.join(' ')}`, 'color: green');
  }
};

const sw = {
  initialize() {
    logger.success('initialize');

    self.addEventListener('install', sw.onInstall);
    self.addEventListener('activate', sw.onActivate);
    self.addEventListener('fetch', sw.onFetch);
    self.addEventListener('sync', sw.onSync);
    self.addEventListener('message', sw.oMessage);
    self.addEventListener('push', sw.onPush);
    self.addEventListener('notificationclick', sw.onNotificationclick);
  },
  onInstall(event) {
    logger.success('install');

    event.waitUntil(
      caches.open(CACHE_VERSION).then(cache => cache.addAll(RESOURCES))
    );
  },
  onActivate(event) {
    logger.success('activate');

    event.waitUntil(
      caches.open(CACHE_VERSION)
      .then(cache => cache.keys())
      .then(keys => sw.deleteCache(keys))
      .then(() => self.clients.claim())
    );
  },
  onFetch(event) {
    const {request} = event;
    const {host} = new URL(request.url);

    console.error('onFetch', host);

    switch (host) {
    case 'api.themoviedb.org':
      return event.respondWith(sw.themoviedbApiCall(request));
    case 'image.tmdb.org':
      return event.respondWith(sw.imgCall(request));
    default:
      return event.respondWith(caches.match(request));
    }
  },
  imgCall(request) {
    return caches.match(request)
      .then(response => {
        if (response) return response;

        return fetch(request)
          .then(fetchResponse => caches.open(CACHE_VERSION).then(cache => {
            cache.put(request, fetchResponse.clone());

            return fetchResponse;
          }))
          .catch(err => console.error('Fetch error', err));
      })
      .catch(err => console.error('Caches match error', err))
  },
  themoviedbApiCall(request) {
    caches.match(request)
      .then(response => {
        if (response) return response;

        return fetch(request)
          .then(() => caches.open(CACHE_VERSION).then(cache => cache.add(request)))
          .catch(err => console.error('Fetch error', err));
      })
      .catch(err => console.error('Caches match error', err))
  },
  deleteCache(names) {
    return Promise.all(
      names
        .filter(cacheName => cacheName !== CACHE_VERSION)
        .map(cacheName => caches.delete(cacheName))
    );
  },
  onNotificationclick() {
    // TODO: check this listener
    logger.success('onNotificationclick');
  },
  onPush() {
    logger.success('onPush');
  },
  onSync(event) {
    logger.success('onSync');

    switch (event.tag) {
    case 'get-movies':
      return event.waitUntil(sw.getMoviesFromRemoteDB());
    case 'get-upcoming-movies':
      return event.waitUntil(sw.loadUpcomingMovies());
    }
  },
  oMessage(event) {
    const {data} = event;
    const {id: clientID} = event.source;
    const {type, body} = data;
    const {id} = body;

    logger.success('oMessage');

    sw.clientID = clientID;

    switch (type) {
    case 'rate':
      return sw.rateMovie(body, event);
    case 'remove':
      return sw.removeMovie(id, body);
    }
  },
  removeMovie(id, body) {
    const queryString = `apiKey=${config.MLAB_API_KEY}`;
    const initObj = { method: 'DELETE' };

    console.error('body', body);

    const {_id} = body;
    const {$oid: movieId} = _id;

    idbKeyval.delete(id);
    sw.sendMessageToClient(sw.clientID, {type: 'remove', body});

    fetch(endpoints.removeMovie(movieId, queryString), initObj)
      .then(response => response.json())
      .then(data => {
        console.error('movie removed from remote DB', data);
      })
      .catch(error => {
        console.error('Error: can\'t remove movie to remote DB.', error);
      });
  },
  rateMovie(body) {
    const queryString = `apiKey=${config.MLAB_API_KEY}`;
    const initObj = {
      method: 'POST',
      headers: new Headers({'Content-Type': 'application/json'}),
      body: JSON.stringify(body)
    };

    // TODO: maybe better save movie at first to indexedDB
    fetch(endpoints.addMovie(queryString), initObj)
      .then(response => response.json())
      .then(movie => {
        logger.success('Movie stored to remote DB');
        sw.saveMovieToIndexedDB(movie);
      })
      .catch(error => {
        console.error('Error: can\'t save movie to remote DB.', error);

        sw.saveMovieToIndexedDB(body);
      });
  },
  saveMovieToIndexedDB(movie) {
    const {id} = movie;

    return idbKeyval.set(id, movie)
      .then(() => {
        logger.success('Movie stored to IndexedDB');

        sw.getMovieFromIndexedDB(id)
          .then(movie => {
            sw.showNotification(movie);
            sw.sendMessageToClient(sw.clientID, {type: 'rate', body: movie});
        })
      })
      .catch(err => console.error('Error: can\'t save movie to indexedDB.', err));
  },
  sendMessageToClient(id, message) {
    sw.getClientById(id).then(client => {
      client.postMessage(message);
    });
  },
  getClientById(id) {
    return clients.get(id).then(client => client);
  },
  sendMessageToAllClients (msg) {
    clients.matchAll().then(clients => {
      clients.forEach(client => client.postMessage({msg}))
    });
  },
  loadUpcomingMovies() {
    const externalApi = `${config.MOVIE_API}upcoming?api_key=${config.TMDB_API_KEY}&language=en-US&page=1`;
    const initObj = {
      method: 'GET',
      headers: new Headers({'Content-Type': 'application/json'})
    };

    return fetch(externalApi, initObj)
      .then(data => data.json())
      .then(response => {
        sw.sendMessageToClient(sw.clientID, {type: 'loaded-upcoming-movies', movies: response.results});
      })
      .catch(err => console.error(err));
  },
  getMoviesFromRemoteDB() {
    const queryString = `apiKey=${config.MLAB_API_KEY}`;
    const initObj = {
      method: 'GET',
      headers: new Headers({'Content-Type': 'application/json'})
    };

    return fetch(endpoints.getMovies(queryString), initObj)
      .then(response => response.json())
      .then(movies => movies)
      .then(movies => sw.sendMessageToClient(sw.clientID, {type: 'riba', movies}))
      .catch(error => {
        console.error('Error: can\'t get movie from remote DB', error);
        sw.getAllMoviesFromIndexedDB();
      });
  },
  getAllMoviesFromIndexedDB() {
    return idbKeyval.keys().then(keys => {
      Promise.all(keys.map(id => idbKeyval.get(id).then(movie => movie)))
        .then(movies => movies)
        .then(movies => sw.sendMessageToClient(sw.clientID, {type: 'riba', movies}))
        .catch(err => console.error('Error: can\'t get movies from indexedDB.', err))
    });
  },
  getMovieFromIndexedDB(id) {
    return idbKeyval.get(id)
      .then(movie => movie)
      .catch(err => console.error('Error: can\'t get movie from indexedDB.', err));
  },
  showNotification(movie) {
    const {id, title, overview, poster_path, rate} = movie;

    if (Notification.permission === 'granted') {
      self.registration.showNotification(`${rate} ${title}`, {
        body: overview,
        icon: `${config.IMG_POSTER_DOMAIN}${poster_path}`,
        data: `${config.MOVIE_DOMAIN}${id}`
      });
    } else {
      console.error('Error: notification permissions denied. Was rated movie:', title);
    }
  }
};

sw.initialize();
