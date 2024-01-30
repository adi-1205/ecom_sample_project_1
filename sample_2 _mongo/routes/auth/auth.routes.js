const router = require('express').Router();
const authController = require('./auth.controller');
const dataInit = require('../../middlewares/initAuthGlobalHBSData');

router.get('/register', dataInit, authController.getRegister)
router.post('/register', authController.postRegister)

router.get('/login', dataInit, authController.getLogin)
router.post('/login', authController.postLogin)

router.get('/logout', authController.getLogout)

router.get('/pwd-reset-email', authController.getPasswordResetEmail)
router.post('/pwd-reset-email', authController.postPasswordResetEmail)

router.get('/reset-pwd/:ftkn', authController.getResetPassword)
router.post('/reset-pwd', authController.postResetPassword)

module.exports = router