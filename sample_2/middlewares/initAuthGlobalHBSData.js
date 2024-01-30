module.exports = async (req, res, next) => {
    let cartCount = null
    if (req.isAuthenticated()) {
        res.locals.isAuthenticated = req.isAuthenticated()
    } 
    if (req.isAuthenticated() && req.user.role === 'user') {
        let cart = await req.user.getCart()
        if (cart) {
            cartCount = await cart.countProducts()
        }
        res.locals.cartCount = cartCount
    }
    else {
        res.locals.cartCount = 0
    }
    next()
}