const mongoCollection = 'https://api.mlab.com/api/1/databases/offline-first/collections/movies';

const endpoints = {
  addMovie: queryString => `${mongoCollection}?${queryString}`,
  getMovies: queryString =>`${mongoCollection}?${queryString}`,
  removeMovie: (movieId, queryString) => `${mongoCollection}/${movieId}?${queryString}`,
};
