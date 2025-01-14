require('dotenv').config();

const bodyParser   = require('body-parser');
const cookieParser = require('cookie-parser');
const express      = require('express');
const favicon      = require('serve-favicon');
const hbs          = require('hbs');
const mongoose     = require('mongoose');
const logger       = require('morgan');
const path         = require('path');
const passport     = require("passport");
const ensureLogin = require("connect-ensure-login");
const bcrypt = require("bcrypt");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");
const flash = require("connect-flash");



mongoose
  .connect('mongodb://localhost/starter-code', {useNewUrlParser: true})
  .then(x => {
    console.log(`Connected to Mongo! Database name: "${x.connections[0].name}"`)
  })
  .catch(err => {
    console.error('Error connecting to mongo', err)
  });

const app_name = require('./package.json').name;
const debug = require('debug')(`${app_name}:${path.basename(__filename).split('.')[0]}`);

const app = express();

// Middleware Setup
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Express View engine setup

app.use(require('node-sass-middleware')({
  src:  path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  sourceMap: true
}));
      

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.ico')));
app.use(session({
	secret: "our-passport-local-strategy-app",
	resave: true,
	saveUninitialized: true
}));




// default value for title local
app.locals.title = 'IRONCOMPANY';



const index = require('./routes/index');
app.use('/', index);
app.use(flash())

function checkRoles(roles) {
	return function (req, res, next) {
		if (req.isAuthenticated() && roles.includes(req.user.role)) {
			return next();
		} else {
			if (req.isAuthenticated()) {
				res.redirect('/')
			}	else {
				res.redirect('/login')
			}
		}
	}
}

// js curry
const checkBoss = checkRoles(['BOSS']);


app.get("/private-createUsers-boss", checkBoss, (req, res) => {
	res.render("onlyforboss", {
		user: req.user,
		"section": "private"
	});
});

app.get("/private-page", ensureLogin.ensureLoggedIn(), (req, res) => {
	res.render("base", {
		user: req.user,
		"section": "private"
	});
});


passport.use(new LocalStrategy({
	passReqToCallback: true
}, (req, username, password, next) => {
	console.log("login")
	console.log(username)
	console.log(password)

	User.findOne({
		username
	}, (err, user) => {
		if (err) {
			return next(err);
		}

		console.log(user)
		if (!user) {
			return next(null, false, {
				message: "Incorrect username"
			});
		}
		if (!bcrypt.compareSync(password, user.password)) {
			return next(null, false, {
				message: "Incorrect password"
			});
		}

		return next(null, user);
	});
}));

passport.serializeUser((user, cb) => {
	console.log("serialize")
	console.log(user._id)
	cb(null, user._id);
});

passport.deserializeUser((id, cb) => {
	console.log("deserialize")
	console.log(id)
	User.findById(id, (err, user) => {
		if (err) {
			return cb(err);
		}
		console.log(user)
		cb(null, user);
	});
});

app.use(passport.initialize());
app.use(passport.session());

app.get('/', ensureLogin.ensureLoggedIn(), (req, res) => {
	res.render('base', {
		user: req.user,
		section: 'index'
	})
})

app.get("/login", (req, res, next) => {
	res.render("base", {
		"message": req.flash("error"),
		"section": "login"
	});
});


// invoked via passport.use(new LocalStrategy({
app.post("/login", passport.authenticate("local", {
	successReturnToOrRedirect: "/",
	failureRedirect: "/login",
	failureFlash: true,
	passReqToCallback: true
}));


module.exports = app;
