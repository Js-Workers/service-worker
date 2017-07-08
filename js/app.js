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

    this.getLikedMoviesFromDB();
  },
  getLikedMoviesFromDB () {
    idbKeyval.keys().then(keys => {
      keys.forEach(id => {
        idbKeyval.get(id).then(movie => {
          this.insertMovie(movie);
        });
      })
    });
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
    this.elements.removeMovie = document.querySelectorAll('.remove-movie');
  },
  fireListeners() {
    this.listeners = {
      'window:online': 'toggleStatus',
      'window:offline': 'toggleStatus',
      'document:DOMContentLoaded': 'insertStatus',
      'rateMovie:click': 'rateMovie'
    };

    Object.keys(this.listeners).forEach(key => {
      const [elementName, eventType] = key.split(':');
      const value = this.listeners[key];
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
      const {type, body} = event.data;

      if (type === 'rate') {
        this.insertMovie(body);
      }

      if (type === 'remove') {
        this.removeMovieFromList(body.id);
      }
    });
  },
  removeMovie (movie) {
    navigator.serviceWorker.controller.postMessage({type: 'remove', body: movie});
  },
  removeMovieFromList (id) {
    const movieId = `movie-${id}`;
    const movieItem = document.getElementById(movieId);

    this.elements.moviesList.removeChild(movieItem);
  },
  rateMovie(e) {
    const img = document.querySelector('.carousel-item.active img');
    const {rate} = e.target.dataset;

    if (img) {
      const id = parseInt(img.getAttribute('id'));
      const movie = this.movies.find(item => item.id === id);

      if (rate === 'like') {
        navigator.serviceWorker.controller.postMessage({type: 'rate', body: Object.assign({}, movie, {rate})});
      } else {
        this.removeImg(id);
      }
    }
  },
  prepareTemplate (template, obj = {}) {
    const regexp = /<%=(.*?)%>/g;
    const replacer = (match, p1) => obj[p1.trim()] || p1.trim();

    return template.replace(regexp, replacer);
  },
  insertMovie(movie) {
    const {id, title, overview, poster_path} = movie;
    const template = document.getElementById('move-item').innerHTML;
    const preparedTemplate = this.prepareTemplate(template, {
      id, title, overview, poster_path
    });

    const wrapper = document.createElement('div');
    wrapper.innerHTML = preparedTemplate;
    wrapper.id = `movie-${id}`;

    const [firstChild] = this.elements.moviesList.children;

    this.elements.moviesList.insertBefore(wrapper, firstChild);

    const removeBtn = wrapper.querySelector('.remove-movie');

    removeBtn.addEventListener('click', () => {
      this.removeMovie(movie);
    });
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
  removeImg (id) {
    const img = document.getElementById(id);
    img.parentNode.removeChild(img);
  },
  showImages(data) {
    data.results.forEach((item, index) => {
      const div = document.createElement('div');
      const img = document.createElement('img');

      div.classList.add('carousel-item');

      if (index === 0) {
        div.classList.add('active');
      }

      img.src = `https://image.tmdb.org/t/p/w300${item.poster_path}`;
      img.id = item.id;

      div.appendChild(img);

      this.elements.content.appendChild(div);
    });
  },
  downloadMovies() {
    const DOMAIN_URL = 'http://localhost:3000';
    const api = `${DOMAIN_URL}/api`;
    const externalApi = 'https://api.themoviedb.org/3/movie/upcoming?api_key=59ff214635b431c1656379bf5aa01a8a&language=en-US&page=1';

    const initObj = {
      method: 'GET',
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    };

    fetch(externalApi, initObj)
      .then(data => {
        data.json().then(response => {
          this.movies = response.results;
          this.showImages(response);
        })
      })
      .catch(err => console.error(err));
  }
};

app.initialize();
