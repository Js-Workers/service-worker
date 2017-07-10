const app = {
  initialize() {
    this.requestNotificationPermission();
    this.cacheElements();
    this.fireListeners();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js', {scope: '/'})
        .then(registration => navigator.serviceWorker.ready)
        .then(sw => {
          this.sw = sw;
          this.sw.active.postMessage({type: 'riba', body: {}});
          this.getLikedMovies();
          this.getupcomingMovies();
        })
        .catch(error => console.error('error', error));
    }
  },
  getLikedMovies() {
    this.sw.sync.register('get-movies')
      .then(() => console.log('Registered "get-movie" sync'))
      .catch(err => console.error('Error: can\'t register "get-movie"', err));
  },
  getupcomingMovies() {
    this.sw.sync.register('get-upcoming-movies')
      .then(() => console.log('Registered "get-upcoming-movies" sync'))
      .catch(err => console.error('Error: can\'t register "get-movie"', err));
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

      switch (type) {
      case 'rate':
        return this.insertMovie(body);
      case 'remove':
        return this.removeMovieFromList(body.id);
      case 'loaded-upcoming-movies':
        return this.showImages(event.data.movies);
      case 'riba':
        event.data.movies.forEach(movie => this.insertMovie(movie))
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
  showImages(movies) {
    this.movies = movies;

    movies.forEach((item, index) => {
      const div = document.createElement('div');
      const img = document.createElement('img');

      div.classList.add('carousel-item');

      if (index === 0) {
        div.classList.add('active');
      }

      img.src = `${config.IMG_POSTER_DOMAIN}${item.poster_path}`;
      img.id = item.id;

      div.appendChild(img);

      this.elements.content.appendChild(div);
    });
  }
};

app.initialize();
