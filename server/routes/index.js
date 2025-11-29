var express = require('express');
var router = express.Router();

const passport = require('passport');
let DB = require('../config/db');
let userModel = require('../models/user');
let User = userModel.User;

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


module.exports = router;
