const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.static('./'));

app.get('/api', (req, res) => {
  res.json({ riba: 'riba'});
});

app.listen(port, () => console.log(`Running on localhost:${port}`));
