const JwtStrategy = require('passport-jwt').Strategy;

const User = require('../models/user.model');

const opt = {
    jwtFromRequest: function (req) {
        if (req.cookies && req.cookies.auth)
            return req.cookies.auth
        else
            return null
    },
    secretOrKey: process.env.JWT_SECRET
}

module.exports = (passport) => {
    passport.use(
        new JwtStrategy(opt, (jwt_payload, done) => {
            User.findByPk(jwt_payload.id)
                .then(user => {
                    if (user) {
                        return done(null, user);
                    } else {
                        return done(null, false);
                    }
                })
                .catch(err => {
                    return done(err, false);
                })
        })
    )
}