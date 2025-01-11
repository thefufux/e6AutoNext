const express = require('express');
const cons = require('@ladjs/consolidate');
const app = express();
const path = require('path');

//Init application
require('./config/config');

app.engine('ejs', cons.ejs);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));
app.use(express.static(path.join(__dirname, '/public')));

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/config', (req, res) => {
  res.json({
    appname:process.env.npm_package_name,
    author:process.env.npm_package_author_name,
    version:process.env.npm_package_version,
    rateLimit:global.rateLimit
  });
});

app.listen(global.listen, () => {
  console.log(`${process.env.npm_package_name} listening on port ${global.listen}`);
});