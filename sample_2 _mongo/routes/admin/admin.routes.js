const router = require('express').Router();

const adminController = require('./admin.controller');
const Auth = require('../../middlewares/auth');
const adminAuth = require('../../middlewares/adminAuth');
const dataInit = require('../../middlewares/initAuthGlobalHBSData');

router.get('/', Auth, adminAuth, dataInit, adminController.getDashboard)
router.get('/products', Auth, adminAuth, dataInit, adminController.getProducts)

router.put('/product', Auth, adminAuth,adminController.putProduct)
router.delete('/product', Auth, adminAuth,adminController.deleteProduct)

router.get('/orders', Auth, adminAuth, dataInit, adminController.getOrders)

module.exports = router