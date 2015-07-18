var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

/***********
 * My routes
 ***********/
var test = require('./routes/test');

var app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/***************
 * My routes Use
 ***************/
app.use('/muf/test', test);

var http = require('http');
app.set('port', 30004); //30004번 포트로 지정
var server = http.createServer(app);
server.listen(app.get('port'));
console.log('[MusicFriends] Application Listening on Port 30004 (80 with Nginx Proxy)');

module.exports = app;