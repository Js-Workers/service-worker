const downloadBtnEl = document.getElementById('download-movies');
const clearBtnEl = document.getElementById('clear-movies');
const contentEl = document.querySelector('.carousel-items-list');

downloadBtnEl.addEventListener('click', event => {
  console.error('click', event);

  const DOMAIN_URL = 'http://localhost:3000';
  const api = `${DOMAIN_URL}/api`;
  const externalApi = 'https://api.themoviedb.org/3/movie/popular?api_key=59ff214635b431c1656379bf5aa01a8a&language=en-US&page=1';

  const initObj = {
    method: 'GET',
    headers: new Headers({
      'Content-Type': 'application/json'
    })
  };

  fetch(externalApi, initObj)
    .then(data => {
      data.json().then(response => showImages(response))
    })
    .catch(err => console.error(err));
});

clearBtnEl.addEventListener('click', () => {
  while (contentEl.firstChild) {
    contentEl.removeChild(contentEl.firstChild);
  }
});

function showImages (data) {
  data.results.forEach((item, index) => {
    const div = document.createElement('div');
    const img = document.createElement('img');

    div.classList.add('carousel-item');

    if (index === 0) {
      div.classList.add('active');
    }

    img.src = `https://image.tmdb.org/t/p/w300${item.poster_path}`;

    div.appendChild(img);

    contentEl.appendChild(div);
  });
}
