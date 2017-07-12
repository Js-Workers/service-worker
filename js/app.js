const app = {
  initialize() {
    this.requestNotificationPermission();
    this.cacheElements();
    this.fireListeners();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js')
        .then(registration => navigator.serviceWorker.ready)
        .then(sw => {
          this.sw = sw;
          this.sw.active.postMessage({type: 'sync-upcoming-movies', body: { tag: 'get-upcoming-movies'}});
          this.sw.active.postMessage({type: 'sync-rated-movies', body: { tag: 'get-rated-movies'}});
        })
        .catch(error => console.error('error', error));
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
        return this.insertRatedMovie(body);
      case 'remove':
        return this.removeMovieFromList(body.id);
      case 'loaded-upcoming-movies':
        return this.showUpcominMovies(event.data.movies);
      case 'loaded-rated-movies':
        event.data.movies.forEach(movie => this.insertRatedMovie(movie))
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
  insertRatedMovie(movie) {
    this.elements.moviesList.insertAdjacentHTML('afterbegin', getRatedMovieTemplate(movie));

    const removeBtnList = this.elements.moviesList.querySelectorAll('.remove-movie');
    const [removeBtn] = removeBtnList;

    removeBtn.addEventListener('click', () => this.removeMovie(movie));
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
  showUpcominMovies(movies) {
    this.movies = movies;

    movies.forEach((item, index) => {
      this.elements.content.insertAdjacentHTML('beforeend', getCarouselItemTemplate(item, index));
    });
  }
};

app.initialize();

function getRatedMovieTemplate(movie) {
  return `<figure class="movie-item" id="movie-${movie.id}">
    <div class="movie-img">
      <img src="https://image.tmdb.org/t/p/w300${movie.poster_path}">
    </div>
    <figcaption class="title">
      <h3>${movie.title}<span class="remove-movie">✖</span></h3>
      <p>${movie.overview}</p>
    </figcaption>
  </figure>`;
}

function getCarouselItemTemplate (item, index) {
  return `<div class="carousel-item ${index === 0 ? 'active' : ''}">
    <img src="https://image.tmdb.org/t/p/w300${item.poster_path}" id="${item.id}">
  </div>`;
}
