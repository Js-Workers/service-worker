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
    case 'get-upcoming-movies':
      return event.waitUntil(sw.syncUpcomingMovies());
    case 'sync-rated-movies':
      // return event.waitUntil(sw.syncUpcomingMovies());
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
    case 'sync-upcoming-movies':
      return sw.getUpcomingMovies();
    case 'sync-rated-movies':
      return sw.getRatedMovies();
    }
  },
  removeMovie(id, body) {
    const queryString = `apiKey=${config.MLAB_API_KEY}`;
    const initObj = { method: 'DELETE' };

    console.error('body', body);

    // TODO: fix movie removing
    const {_id: {}} = body;
    const {$oid: movieId} = _id;

    // TODO: First - remove from indexedDB
    idbKeyval.delete(id);
    sw.sendMessageToClient(sw.clientID, {type: 'remove', body});

    // TODO: Second - try remove from remote DB
    fetch(endpoints.removeMovie(movieId, queryString), initObj)
      .then(response => response.json())
      .then(data => {
        console.error('movie removed from remote DB', data);
      })
      .catch(error => {
        // TODO: No Internet connection - register sync
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

    // TODO: First - save movie to indexedDB
    sw.saveMovieToIndexedDB(body);

    // TODO: Second - save movie to remote DB
    fetch(endpoints.addMovie(queryString), initObj)
      .then(response => response.json())
      .then(movie => {
        logger.success('Movie stored to remote DB');
        console.error('movie', movie);
      })
      .catch(error => {
        // TODO: No Internet connection - register sync
        console.error('Error: can\'t save movie to remote DB.', error);
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
  makeRequestForUpcomingMovies() {
    return fetch(sw.createRequestForUpcomingMovies());
  },
  createRequestForUpcomingMovies() {
    const externalApi = `${config.MOVIE_API}upcoming?api_key=${config.TMDB_API_KEY}&language=en-US&page=1`;
    const initObj = {
      method: 'GET',
      headers: new Headers({'Content-Type': 'application/json'})
    };

    return new Request(externalApi, initObj);
  },
  syncUpcomingMovies() {
    sw.makeRequestForUpcomingMovies()
      .then(response => response.json())
      .then(response => {
        sw.sendMessageToClient(sw.clientID, {type: 'loaded-upcoming-movies', movies: response.results});
      })
  },
  getUpcomingMovies() {
    const request = sw.createRequestForUpcomingMovies();

    return sw.makeRequestForUpcomingMovies(request)
      .then(() => caches.open(CACHE_VERSION)
      .then(cache => cache.add(request)))
      .then(() => caches.match(request))
      .then(response => response.json())
      .then(response => {
        sw.sendMessageToClient(sw.clientID, {type: 'loaded-upcoming-movies', movies: response.results});
      })
      .catch(err => {
        console.error(err);

        caches.match(request)
          .then(response => response.json())
          .then(response => {
            sw.sendMessageToClient(sw.clientID, {type: 'loaded-upcoming-movies', movies: response.results});
          })
          .catch(err => sw.registerSync('get-upcoming-movies', err))
      });
  },
  registerSync(tag, err) {
    logger.error('Error: ', err);
    self.registration.sync.register(tag);
  },
  makeRequestForRatedMovies() {
    const queryString = `apiKey=${config.MLAB_API_KEY}`;
    const initObj = {
      method: 'GET',
      headers: new Headers({'Content-Type': 'application/json'})
    };

    return fetch(endpoints.getMovies(queryString), initObj)
  },
  getRatedMovies() {
    sw.makeRequestForRatedMovies()
    .then(response => response.json())
    .then(movies => sw.sendMessageToClient(sw.clientID, {type: 'riba', movies}))
    .catch(() => {
      sw.getAllMoviesFromIndexedDB()
      .then(movies => {
        if (!movies.length) {
          return sw.registerSync('sync-rated-movies', {message: 'indexedDB is empty!'})
        }

        sw.sendMessageToClient(sw.clientID, {type: 'riba', movies})
      })
      .catch(err => sw.registerSync('sync-rated-movies', err))
    })
  },
  // getAllRatedMoviesFromRemoteDB() {
  //   sw.makeRequestForRatedMovies()
  //   .then(response => response.json())
  //   .then(movies => sw.sendMessageToClient(sw.clientID, {type: 'riba', movies}))
    // .catch(err => sw.registerSync('sync-rated-movies', err))
  // },
  getAllMoviesFromIndexedDB() {
    return idbKeyval.keys().then(keys =>
     Promise.all(keys.map(id => idbKeyval.get(id).then(movie => movie))));
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
