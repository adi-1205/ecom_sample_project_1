const router = require('express').Router();

const authRoutes = require('./auth/auth.routes');
const userRoutes = require('./users/shop.routes');
const adminRoutes = require('./admin/admin.routes');

router.use('/auth', authRoutes)
router.use('/admin', adminRoutes)
router.use('/', userRoutes)

module.exports =  router