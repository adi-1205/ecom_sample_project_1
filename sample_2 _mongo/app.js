require('dotenv').config();
const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const passport = require('passport');
const { engine } = require('express-handlebars')
const session = require('express-session');
const flash = require('connect-flash');


const routes = require('./routes/routes');
require('./middlewares/passport')(passport);
require('./config/db');


const app = express()
const PORT = process.env.PORT || 3000

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cookieParser(process.env.SESSION_SECRET))
app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET,
    cookie: { maxAge: 600000 }
}));
app.use(flash())
app.use(passport.initialize())
app.use(express.static('public'))
app.use(express.static('uploads'))

app.use('/', routes)

app.use((err, req, res, next) => {
    console.log(err);
    res.sendStatus(500)
})


app.listen(process.env.PORT, () => {
    console.log(`Running at -> http://localhost:${PORT}`);
})
