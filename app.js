var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var log = require('./logger');

/***********
 * My routes
 ***********/
var test = require('./routes/test');
var user = require('./routes/userCtrl');

var session = require('express-session');  // express session

var app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
}));

/***************
 * My routes Use
 ***************/
app.use('/wave/test', test);
app.use('/wave/user', user);

var http = require('http');
app.set('port', 30004); //30004번 포트로 지정
var server = http.createServer(app);
server.listen(app.get('port'));
log.info('[MusicFriends] Application Listening on Port 30004 (80 with Nginx Proxy)');

module.exports = app;