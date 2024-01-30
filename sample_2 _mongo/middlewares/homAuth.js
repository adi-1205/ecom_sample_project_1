const passport = require('passport');

module.exports = (req, res, next) => {
    passport.authenticate('jwt', (err, user, info, status) => {
        if (err) {
            return next(err)
        }
        if (!user) {
            if (req.url === '/') {
                return next()
            }
        } else {
            req.user = user
            res.locals.isAuthenticated = req.isAuthenticated()
            return next()
        }
    })(req, res, next)
}