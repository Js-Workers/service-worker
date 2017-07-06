const app = {
  initialize() {
    this.requestNotificationPermission();
    this.cacheElements();
    this.fireListeners();
    this.downloadMovies();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js', {scope: '/'})
        .then(registration => navigator.serviceWorker.ready)
        .then(registration => {
          console.error('registration', registration);

          registration.sync.register('rate-movie')
            .then(() => {
              console.log('rate-movie: sync registered');
            })
            .catch(err => {
              console.error('err', err);
            });
        })
        .catch(error => {
          console.error('error', error);
        });
    }
  },
  requestNotificationPermission() {
    Notification.requestPermission(result => {
      if (result !== 'granted') {
        console.error('Denied notification permission')
      }
    });
  },
  cacheElements() {
    this.elements = {};

    this.elements.content = document.querySelector('.carousel-items-list');
    this.elements.status = document.querySelector('.connection-status');
    this.elements.rateMovie = document.querySelectorAll('.js-rate-movie');
    this.elements.moviesList = document.querySelector('.movies-list');
    // this.elements.rateBtnsContainer = document.querySelector('.rate-buttons-container');
  },
  fireListeners() {
    const listeners = {
      'window:online': 'toggleStatus',
      'window:offline': 'toggleStatus',
      'document:DOMContentLoaded': 'insertStatus',
      // 'clearBtn:click': 'clearImages',
      // 'downloadBtn:click': 'downloadMovies',
      'rateMovie:click': 'rateMovie',
    };

    Object.keys(listeners).forEach(key => {
      const [elementName, eventType] = key.split(':');
      const value = listeners[key];
      const element = this.elements[elementName] || window[elementName];
      const addListener = item => item.addEventListener(eventType, this[value].bind(this));

      if (element.length) {
        this.elements[elementName].forEach(item => {
          addListener(item)
        })
      } else {
        addListener(element);
      }
    });

    navigator.serviceWorker.addEventListener('message', event => {
      console.error('echo from service worker!', event);
    });
  },
  rateMovie(e) {
    const img = document.querySelector('.carousel-item.active img');
    const {rate} = e.target.dataset;

    if (img) {
      const id = parseInt(img.getAttribute('alt'));
      const movie = this.movies.find(item => item.id === id);

      navigator.serviceWorker.controller.postMessage(Object.assign({}, movie, {rate}));
    }
  },
  toggleStatus(e) {
    const {status} = this.elements;
    const {type} = e;

    status.classList.toggle('online');
    status.textContent = type;
  },
  insertStatus() {
    const {status} = this.elements;
    const type = navigator.onLine ? 'online' : 'offline';

    status.classList.toggle(type);
    status.textContent = type;
  },
  // clearImages() {
  //   const {content} = this.elements;
  //
  //   while (content.firstChild) {
  //     content.removeChild(content.firstChild);
  //   }
  //
  //   this.dataDownloaded = false;
  // },
  showImages(data) {
    data.results.forEach((item, index) => {
      const div = document.createElement('div');
      const img = document.createElement('img');

      div.classList.add('carousel-item');

      if (index === 0) {
        div.classList.add('active');
      }

      img.src = `https://image.tmdb.org/t/p/w300${item.poster_path}`;
      img.alt = item.id;

      div.appendChild(img);

      this.elements.content.appendChild(div);
    });
  },
  downloadMovies() {
    const DOMAIN_URL = 'http://localhost:3000';
    const api = `${DOMAIN_URL}/api`;
    const externalApi = 'https://api.themoviedb.org/3/movie/popular?api_key=59ff214635b431c1656379bf5aa01a8a&language=en-US&page=1';

    const initObj = {
      method: 'GET',
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    };

    // if (!this.dataDownloaded) {
      fetch(externalApi, initObj)
      .then(data => {
        data.json().then(response => {
          // this.dataDownloaded = true;
          this.movies = response.results;
          this.showImages(response);
        })
      })
      .catch(err => console.error(err));
    // }
  }
};

app.initialize();
