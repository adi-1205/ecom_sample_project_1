const Cart = require("../models/cart.model");
const User = require("../models/user.model");

module.exports = async (req, res, next) => {

    let cartCount = null
    if (req.isAuthenticated()) {
        res.locals.isAuthenticated = req.isAuthenticated()
    }
    if (req.isAuthenticated() && req.user.role === 'user') {
        try {
            let user = await User.findById(req.user._id);
            let cart = await Cart.findOne({ user: user._id });

            if (cart) {
                cartCount = cart.items.length;
            }

            res.locals.cartCount = cartCount || 0;
        } catch (err) {
            console.log(err);
            res.locals.cartCount = 0;
        }
    }
    else {
        res.locals.cartCount = 0
    }
    next()
}