require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

let mongoose = require('mongoose');
let DB = require('./db');

// Authentication imports
let session = require('express-session');
let passport = require('passport');
let passportLocal = require('passport-local');
let localStrategy = passportLocal.Strategy;
let GitHubStrategy = require('passport-github2').Strategy;
let GoogleStrategy = require('passport-google-oauth20').Strategy;
let DiscordStrategy = require('passport-discord').Strategy;
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
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true
  }
}));

// Initialize flash
app.use(flash());

// Configure Passport strategies
passport.use(User.createStrategy());

// GitHub Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || "https://careerpointer.onrender.com/auth/github/callback",
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
      let user = await User.findOne({ 'oauth.githubId': profile.id });
      
      if (!user) {
        user = new User({
          username: profile.username || profile.displayName,
          displayName: profile.displayName || profile.username,
          email: profile.emails && profile.emails[0] ? profile.emails[0].value : '',
          avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : '/content/images/default-avatar.png',
          oauth: {
            githubId: profile.id,
            provider: 'github'
          }
        });
        await user.save();
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "https://careerpointer.onrender.com/auth/google/callback",
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
      let user = await User.findOne({ 'oauth.googleId': profile.id });
      
      if (!user) {
        user = new User({
          username: profile.emails[0].value.split('@')[0],
          displayName: profile.displayName,
          email: profile.emails[0].value,
          avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : '/content/images/default-avatar.png',
          oauth: {
            googleId: profile.id,
            provider: 'google'
          }
        });
        await user.save();
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Discord Strategy
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.DISCORD_CALLBACK_URL || "https://careerpointer.onrender.com/auth/discord/callback",
    scope: ['identify', 'email']
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
      let user = await User.findOne({ 'oauth.discordId': profile.id });
      
      if (!user) {
        user = new User({
          username: profile.username,
          displayName: profile.username,
          email: profile.email || '',
          avatar: profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : '/content/images/default-avatar.png',
          oauth: {
            discordId: profile.id,
            provider: 'discord'
          }
        });
        await user.save();
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Serialize and deserialize user
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Expose auth info to views
app.use((req, res, next) => {
  res.locals.displayName = req.user ? req.user.displayName : '';
  res.locals.userAvatar = req.user && req.user.avatar
    ? req.user.avatar
    : '/content/images/default-avatar.png';
  next();
});

// View engine setup
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

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error', {title: 'Error'});
});

module.exports = app;