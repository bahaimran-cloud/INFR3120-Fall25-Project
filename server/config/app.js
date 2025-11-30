var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

let mongoose = require('mongoose');
let DB = require('./db');

//ADDED FOR USER AUTHENTICATION
let session = require('express-session');
let passport = require('passport');
passportLocal = require('passport-local'); 
let localStrategy = passportLocal.Strategy;
let flash = require('connect-flash');
let cors = require('cors');
var app = express();

// Configure CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

let userModel = require('../models/user');
let User = userModel.User;


var indexRouter = require('../routes/index');
var usersRouter = require('../routes/users');

let ApplicationRouter = require('../routes/JobApplication');

// Test the DB connection
mongoose.connect(DB.URI);
let mongoDB = mongoose.connection;
mongoDB.on('error', console.error.bind(console, 'Connection Error'));
mongoDB.once('open', ()=>{
  console.log('Connected to MongoDB...');
});

app.use(session({
  secret: process.env.SESSION_SECRET || "SomeSecretString",
  saveUninitialized: false,
  resave: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true',
    sameSite: 'lax', // 'lax' works fine for same-site apps
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true
  }
}));

//initialize flash
app.use(flash());

//serialize and deserialize the user info
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//initialize passport
app.use(passport.initialize());
app.use(passport.session());

// expose auth info to views (for navbar avatar/display name)
app.use((req, res, next) => {
  res.locals.displayName = req.user ? req.user.displayName : '';
  res.locals.userAvatar = req.user && req.user.avatar
    ? req.user.avatar
    : '/content/images/default-avatar.png';
  next();
});

// view engine setup
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../../public')));
app.use(express.static(path.join(__dirname, '../../node_modules')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/applications', ApplicationRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error', {title: 'Error'});
});

module.exports = app;
