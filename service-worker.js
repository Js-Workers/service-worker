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
  '/utils/carousel/carousel.css',
  '/utils/carousel/carousel.js',
  '/node_modules/idb-keyval/idb-keyval.js',
  'https://fonts.gstatic.com/s/materialicons/v22/2fcrYFNaTjcS6g4U3t-Y5ZjZjT5FdEJ140U2DJYC3mY.woff2'
];

const logger = {
  error(...args) {
    console.error(...args);
  },
  success(...args) {
    console.error(`%c${args.join(' ')}`, 'color: green');
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
  onNotificationclick() {
    // TODO: check this listener
    logger.success('onNotificationclick');
  },
  onPush() {
    logger.success('onPush');
  },
  onSync(event) {
    logger.success('onSync');

    if (event.tag === 'get-movies') {
      event.waitUntil(sw.getMovies());
    }

    if (event.tag === 'get-upcoming-movies') {
      event.waitUntil(sw.loadUpcomingMovies());
    }
  },
  oMessage(event) {
    console.error('oMessage', event);

    const {data} = event;
    const {id: clientID} = event.source;
    const {type, body} = data;
    const {id} = body;

    sw.clientID = clientID;

    console.error('event.clientID', clientID);

    if (type === 'rate') {
      const queryString = `apiKey=${config.MLAB_API_KEY}`;
      const initObj = {
        method: 'POST',
        headers: new Headers({'Content-Type': 'application/json'}),
        body: JSON.stringify(body)
      };

      fetch(endpoints.addMovie(queryString), initObj)
      .then(response => response.json())
      .then(movie => {
        logger.success('Movie stored to remote DB');
        sw.saveMovieToLocalDB(movie, event);
      })
      .catch(error => {
        logger.error('Error: can\'t save movie to remote DB.', error);

        sw.saveMovieToLocalDB(body, event);
      });
    }

    if (type === 'remove') {
      console.error('body', body);
      idbKeyval.delete(id);
      event.source.postMessage({type: 'remove', body});
    }
  },
  // sendMessageToClient (client, msg) {
  //   client.postMessage("SW Says: '"+msg+"'");

    // return new Promise((resolve, reject) => {
    //   const channel = new MessageChannel();
    //
    //   channel.port1.onmessage = ({data}) => {
    //     data.error ? reject(event.data.error) : resolve(data);
    //   };
    //
    //   client.postMessage("SW Says: '"+msg+"'", [channel.port2]);
    // });
  // },
  getCurrentClient(id) {
    return clients.get(id).then(client => client);
  },
  sendMessageToAllClients (msg) {
    clients.matchAll().then(clients => {
      clients.forEach(client => client.postMessage({msg}))
    });
  },
  loadUpcomingMovies() {
    const externalApi = `https://api.themoviedb.org/3/movie/upcoming?api_key=${config.TMDB_API_KEY}&language=en-US&page=1`;
    const initObj = {
      method: 'GET',
      headers: new Headers({'Content-Type': 'application/json'})
    };

    fetch(externalApi, initObj)
      .then(data => {
        data.json().then(response => {
          console.error('response.results', response.results);

          sw.getCurrentClient(sw.clientID).then(client => {
            client.postMessage({type: 'loaded-upcoming-movies', movies: response.results});
          });
        })
      })
      // TODO: check this
      // .catch(err => console.error(err));
  },
  getMovies() {
    const queryString = `apiKey=${config.MLAB_API_KEY}`;
    const initObj = {
      method: 'GET',
      headers: new Headers({'Content-Type': 'application/json'})
    };

    fetch(endpoints.getMovies(queryString), initObj)
      .then(response => response.json())
      .then(movies => {
        console.log('movies', movies);

        return movies;
      })
      // TODO: rethink this in context of background sync
      // .catch(error => {
      //   logger.error('Error: can\'t get movies from remote DB.', error);
      //
      //   return sw.getAllMoviesFromIndexedDB();
      // });
  },
  getAllMoviesFromIndexedDB() {
    return idbKeyval.keys().then(keys => {
      Promise.all(keys.map(id => idbKeyval.get(id).then(movie => movie)))
        .then(movies => {
          // console.error('All movies from IndexedDB', movies);
          return movies;
        })
        .catch(err => logger.error('Error: can\'t get movies from indexedDB.', err))
    });
  },
  saveMovieToLocalDB(movie, event) {
    const {id} = movie;

    return idbKeyval.set(id, movie)
      .then(() => {
        logger.success('Movie stored to IndexedDB');

        idbKeyval.get(id)
          .then(movie => {
            sw.showNotification(movie);
            event.source.postMessage({type: 'rate', body: movie});
          })
          .catch(err => logger.error('Error: can\'t get movie from indexedDB.', err));
      })
      .catch(err => logger.error('Error: can\'t save movie to indexedDB.', err));
  },
  showNotification(movie) {
    const {id, title, overview, poster_path, rate} = movie;

    if (Notification.permission === 'granted') {
      self.registration.showNotification(`${rate} ${title}`, {
        body: overview,
        icon: `${config.IMG_DOMAIN}${poster_path}`,
        data: `${config.MOVIE_DOMAIN}${id}`
      });
    } else {
      logger.error('Error: notification permissions denied. Was rated movie:', title);
    }
  },
  onInstall(event) {
    console.error('install', event);

    event.waitUntil(
      caches.open(CACHE_VERSION).then(cache => cache.addAll(RESOURCES))
    );
  },
  onActivate(event) {
    console.error('activate', event);

    event.waitUntil(
      caches.open(CACHE_VERSION)
        .then(cache => cache.keys())
        .then(keys => {
          // keys.forEach(key => console.log(key));
          sw.deleteCache(keys);
        })
        .then(() => self.clients.claim())
    );
  },
  deleteCache(names) {
    return Promise.all(
      names
        .filter(cacheName => cacheName !== CACHE_VERSION)
        .map(cacheName => caches.delete(cacheName))
    );
  },
  isApiCall(host) {
    return host === 'api.themoviedb.org';
  },
  isImgCall(host) {
    return host === 'image.tmdb.org';
  },
  onFetch(event) {
    const {host} = new URL(event.request.url);

    if (sw.isApiCall(host)) {
      event.respondWith(
        caches.match(event.request)
          .then(response => {
            if (response) return response;

            return fetch(event.request)
              .then(() => caches.open(CACHE_VERSION).then(cache => cache.add(event.request)))
              .catch(err => console.error('Fetch error', err));
          })
          .catch(err => {
            console.error('Caches match error', err);
          })
      );
    }
    else if (sw.isImgCall(host)) {
      event.respondWith(
        caches.match(event.request)
          .then(response => {
            if (response) return response;

            return fetch(event.request)
              .then(fetchResponse => caches.open(CACHE_VERSION).then(cache => {
                cache.put(event.request, fetchResponse.clone());

                return fetchResponse;
              }))
              .catch(err => console.error('Fetch error', err));
          })
          .catch(err => console.error('Caches match error', err)));
    }
    else {
      event.respondWith(caches.match(event.request));
    }
  }
};

sw.initialize();
