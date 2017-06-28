const btn = document.getElementById('btn');

btn.addEventListener('click', event => {
  console.error('click', event);

  const DOMAIN_URL = 'http://localhost:3000';
  const api = `${DOMAIN_URL}/api`;

  fetch(api)
  .then(data => {
    console.error(data);

    data.json().then(response => {
      console.error('response', response);
    })
  })
  .catch(err => console.error(err));
});
