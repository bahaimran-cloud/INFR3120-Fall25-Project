const crypto = require('crypto');

var express = require('express');
var router = express.Router();

const passport = require('passport');
let DB = require('../config/db');
let userModel = require('../models/user');
let User = userModel.User;

function renderPasswordPage(req, res, token = '') {
  res.render('auth/password', {
    title: 'Account - Password',
    displayName: res.locals.displayName,
    user: req.user,
    token,
    changeMessage: req.flash('changeMessage'),
    resetMessage: req.flash('resetMessage'),
    isAuthenticated: req.isAuthenticated && req.isAuthenticated()
  });
}


function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

// Multer setup for file uploads
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../public/uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user._id}-${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB cap
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Images only'));
    cb(null, true);
  }
});

router.get('/profile', ensureAuth, (req, res) => {
  res.render('auth/profile', {
    title: 'Your Profile',
    user: req.user,
    displayName: req.user.displayName,
    message: req.flash('profileMessage')
  });
});

router.post('/profile/photo', ensureAuth, upload.single('avatar'), async (req, res, next) => {
  if (!req.file) {
    req.flash('profileMessage', 'Please choose an image');
    return res.redirect('/profile');
  }
  try {
    req.user.avatar = `/uploads/${req.file.filename}`;
    await req.user.save();
    res.redirect('/profile');
  } catch (err) {
    next(err);
  }
});


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Career Pointer - Home' , displayName: req.user ? req.user.displayName : ''});
});

router.get('/aboutus', function(req, res, next) {
  res.render('about', { title: 'Career Pointer - About Us' , displayName: req.user ? req.user.displayName : '' });
});

router.get('/contact', function(req, res, next) {
  res.render('contact', { title: 'Career Pointer - Contact Us' , displayName: req.user ? req.user.displayName : ''});
});

// Get method for login
router.get('/login', function(req,res,next){
  if(!req.user)
  {
    res.render('auth/login',
      {
      title:'Career Pointer - Login',
      message: req.flash('loginMessage')
      }

    )
  }
  else
  {
    return res.redirect("/")
  }
});

// GitHub OAuth routes
router.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

router.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/applications');
  }
);

// Google OAuth routes
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/applications');
  }
);

// Discord OAuth routes
router.get('/auth/discord',
  passport.authenticate('discord')
);

router.get('/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/applications');
  }
);

// Post method for login
router.post('/login', function(req,res,next){
  passport.authenticate('local',(err,user,info)=>{
    if(err)
    {
      return next(err);
    }
    if(!user)
    {
      req.flash('loginMessage','AuthenticationError');
      return res.redirect('/login');
    }
    req.login(user,(err)=>{
    if(err)
    {
      return next(err);
    }
    return res.redirect("/applications");
    })
  })(req,res,next)
});

// Get method for register
router.get('/register', function(req,res,next){
  if(!req.user)
  {
    res.render('auth/register',
      {
      title:'Career Pointer - Register',
      message: req.flash('registerMessage')
      }

    )
  }
  else
  {
    return res.redirect("/")
  }
});

// Post method for register
router.post('/register', function(req,res,next){
  let newUser = new User({
    username: req.body.username,
    //password: req.body.password,
    email:req.body.email,
    displayName: req.body.displayName
  })
  User.register(newUser, req.body.password, (err)=>{
    if(err)
    {
      console.log("Error:Inserting the new user");
      if(err.name=="UserExistingError")
      {
        req.flash('registerMessage','Registration Error:User already Exist');
      }
      return res.render('auth/register',
        {
          title:'Career Pointer - Register',
          message:req.flash('registerMessage')
        }
      )
    }
    else{
      return passport.authenticate('local')(req,res,()=>{
        res.redirect("/applications");
      })
    }
  })
});
router.get('/logout',function(req,res,next){
req.logout(function(err)
{
  if(err)
  {
    return next(err)
  }
})
res.redirect("/");
})

router.get('/password', (req, res) => {
  renderPasswordPage(req, res, req.query.token || '');
});

router.post('/password/change', ensureAuth, (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (newPassword !== confirmPassword) {
    req.flash('changeMessage', 'New passwords do not match.');
    return res.redirect('/password');
  }
  req.user.changePassword(currentPassword, newPassword, err => {
    if (err) {
      req.flash('changeMessage', 'Current password incorrect or invalid new password.');
      return res.redirect('/password');
    }
    req.flash('changeMessage', 'Password updated successfully.');
    res.redirect('/password');
  });
});

router.post('/password/forgot', async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim();
    const user = await User.findOne({ email });
    const token = crypto.randomBytes(20).toString('hex');
    if (user) {
      user.resetToken = token;
      user.resetExpires = Date.now() + 3600000; // 1 hour
      await user.save();
      // TODO: send email with the link below
    }
    req.flash('resetMessage', `If that email exists, a reset link was prepared. Link: /password/reset/${token}`);
    res.redirect('/password');
  } catch (err) { next(err); }
});

router.get('/password/reset/:token', async (req, res, next) => {
  try {
    const user = await User.findOne({
      resetToken: req.params.token,
      resetExpires: { $gt: Date.now() }
    });
    if (!user) {
      req.flash('resetMessage', 'Reset link is invalid or expired.');
      return res.redirect('/password');
    }
    res.redirect(`/password?token=${req.params.token}`);
  } catch (err) { next(err); }
});

router.post('/password/reset/:token', async (req, res, next) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    const user = await User.findOne({
      resetToken: req.params.token,
      resetExpires: { $gt: Date.now() }
    });
    if (!user) {
      req.flash('resetMessage', 'Reset link is invalid or expired.');
      return res.redirect('/password');
    }
    if (newPassword !== confirmPassword) {
      req.flash('resetMessage', 'Passwords do not match.');
      return res.redirect(`/password?token=${req.params.token}`);
    }
    await user.setPassword(newPassword);
    user.resetToken = '';
    user.resetExpires = undefined;
    await user.save();
    req.login(user, () => {
      req.flash('resetMessage', 'Password reset successfully.');
      res.redirect('/password');
    });
  } catch (err) { next(err); }
});



module.exports = router;
