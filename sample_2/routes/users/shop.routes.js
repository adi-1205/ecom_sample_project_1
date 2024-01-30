const router = require('express').Router();

const Auth = require('../../middlewares/auth');
const homeAuth = require('../../middlewares/homAuth');
const dataInit = require('../../middlewares/initAuthGlobalHBSData');
const multerErrorHandler = require('../../middlewares/multerError');
const userAuth = require('../../middlewares/userAuth');

const shopController = require('./shop.controller');

router.get('/', homeAuth, dataInit, shopController.home)

router.get('/products', Auth, userAuth, dataInit, shopController.getProducts)

router.get('/product/:id', Auth, userAuth, dataInit, shopController.getProduct)
router.post('/product', Auth, multerErrorHandler, shopController.postProduct)
router.put('/product', Auth, shopController.putProduct)
router.delete('/product', Auth, shopController.deleteProduct)

router.get('/seller-profile', Auth, userAuth, dataInit, shopController.getSellerProfile)

router.get('/cart', Auth, userAuth, dataInit, shopController.getCart)
router.post('/cart', Auth, userAuth, shopController.postCart)
router.delete('/cart', Auth, userAuth, shopController.deleteCart)

router.get('/orders', Auth, userAuth, dataInit, shopController.getOrders)
router.post('/order', Auth, userAuth, shopController.postOrder)



module.exports = router