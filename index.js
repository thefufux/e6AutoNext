//Init application
require(__dirname + '/config/config');

const express = require('express');
const cons = require('@ladjs/consolidate');
const app = express();

app.engine('ejs', cons.ejs);
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));

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