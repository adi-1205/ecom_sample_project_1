
const upload = require('../config/multer');
const multer = require('multer');
const productUpload = upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'images', maxCount: 5 }])

module.exports = (req, res, next) => {
    productUpload(req, res, err => {
        if (err instanceof multer.MulterError) {
            console.log(err);
            res.status(400).send('image size should be less then 5mb')
        } else {
            next()
        }
    })
}