require('dotenv').config();
const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const passport = require('passport');
const { engine } = require('express-handlebars')
const session = require('express-session');
const flash = require('connect-flash');


const routes = require('./routes/routes');
const sequelize = require('./config/db');
const Product = require('./models/product.model');
const Category = require('./models/category.model');
const User = require('./models/user.model');
const Cart = require('./models/cart.model');
const CartItem = require('./models/cartItem.model');
const Order = require('./models/order.model');
const OrderItem = require('./models/orderItem.model');
require('./middlewares/passport')(passport);


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



User.hasMany(Product)
Product.belongsTo(User)
Category.hasMany(Product)
Product.belongsTo(Category)

User.hasOne(Cart)
Cart.belongsTo(User)

Cart.belongsToMany(Product, { through: CartItem })
Product.belongsToMany(Cart, { through: CartItem })

User.hasMany(Order)
Order.belongsTo(User)

Order.belongsToMany(Product, { through: OrderItem })
Product.belongsToMany(Order, { through: OrderItem })

// sequelize
//     .query('SET FOREIGN_KEY_CHECKS = 0', null, { raw: true })
//     .then(function (results) {
//         sequelize.sync({ force: true });
//     });
sequelize.authenticate()
    .then(() => sequelize.sync())
    .then(() => {
        app.listen(process.env.PORT, () => {
            console.log(`Running at -> http://localhost:${PORT}`);
        })
    })
    .catch(err => {
        console.log(err);
    })

