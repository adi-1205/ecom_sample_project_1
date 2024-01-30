const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const User = require("../../models/user.model")
const transporter = require('../../utils/email');

const FlashUserError = require('../../utils/FlashUserError');

const getRegister = (req, res) => {
    return res.render('register', {
        registerPage: true
    })
}

const postRegister = async (req, res) => {
    const { username, email, password } = req.body

    try {

        if (!username || !email || !password) {
            throw new FlashUserError('Please fill in all the field')
        }

        if (!validator.isEmail(email)) {
            throw new FlashUserError('Invalid email address')
        }
        if (!validator.isStrongPassword(password)) {
            throw new FlashUserError('Weak password')
        }

        const emailExists = await User.findOne({ where: { email: email } })

        if (emailExists) {
            throw new FlashUserError('Email already exists')
        }

        await User.create({ username, email, password: await bcrypt.hash(password, 12) })

        // return res.status(200).send({ message: 'Registered successfully!' })
        res.status(200).json({ message: 'registred successfully' })

    } catch (err) {
        if (err instanceof FlashUserError) {
            return res.status(400).json({ error: err.message })
        }
        console.log(err);
        return res.status(500).json({ error: 'Something went wrong!' })
    }

}

const getLogin = (req, res) => {
    return res.render('login', {
        loginPage: true,
    })
}

const postLogin = async (req, res) => {
    const { email, password } = req.body

    try {

        if (!email || !password) {
            throw new FlashUserError('Please fill in all the field')
        }

        if (!validator.isEmail(email)) {
            throw new FlashUserError('Invalid email address')
        }

        const user = await User.findOne({ where: { email: email } })

        if (!user) {
            throw new FlashUserError('Email does not exist')
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (!isMatch) {
            throw new FlashUserError('Invalid email or password')
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' })
        res.cookie('auth', token, { httpOnly: true })
        if (user.role === 'admin') {
            return res.json({redirect:'/admin'})
        }
        return res.status(200).json({ message: 'Logged in successfully!' })

    } catch (err) {
        if (err instanceof FlashUserError) {
            return res.status(400).json({ error: err.message })
        }
        console.log(err);
        return res.status(400).json({ error: 'Something went wrong!' })
    }
}

const getLogout = (req, res) => {
    res.cookie('auth', '', { maxAge: -1 })
    return res.redirect('/')
}

const getPasswordResetEmail = (req, res) => {
    return res.render('pwdResetEmail', {
        navpart: true,
    })
}

const postPasswordResetEmail = async (req, res) => {

    const { email } = req.body

    try {

        if (!email) {
            throw new FlashUserError('Please fill in all the field')
        }

        if (!validator.isEmail(email)) {
            throw new FlashUserError('Invalid email address')
        }

        const user = await User.findOne({ where: { email: email } })

        if (!user) {
            throw new FlashUserError('Email does not exist')
        }

        const uuid = crypto.randomUUID().replaceAll('-', '')

        await user.update({ forgetPasswordToken: uuid })

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'Reset Password Link',
            html: `
            <!DOCTYPE html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <style>
        body{
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
        }
    </style>
</head>
<body>
    <h3>
        Click the link below to change the Password
    </h3>
    <a href="http://localhost:8000/auth/reset-pwd/${uuid}">Change Password</a>
</body>
            </html>`
        }

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.log(err);
                throw new FlashUserError('Email can not be sent!')
            } else {
                return res.status(200).json({ message: 'Check your email!' })
            }
        })
    } catch (err) {
        if (err instanceof FlashUserError) {
            return res.status(400).json({ error: err.message })
        }
        console.log(err);
        return res.status(400).json({ error: 'Something went wrong!' })
    }
}

const getResetPassword = async (req, res) => {
    return res.render('resetPassword', {
        navpart: true
    })
}

const postResetPassword = async (req, res) => {

    const { password, cpassword, token } = req.body

    try {

        if (!password || !cpassword || !token) {
            throw new FlashUserError('Invalid Fields')
        }

        if (password !== cpassword) {
            throw new FlashUserError('Passwords do not match')
        }

        if (!validator.isStrongPassword(password)) {
            throw new FlashUserError('Weak password')
        }

        const user = await User.findOne({ where: { forgetPasswordToken: token } })

        if (!user) {
            throw new FlashUserError('Invalid Token')
        }

        await user.update({ password: await bcrypt.hash(password, 12), forgetPasswordToken: null })

        return res.status(200).json({ message: 'Password reset successfully!' })

    } catch (err) {
        if (err instanceof FlashUserError) {
            return res.status(400).json({ error: err.message })
        }
        console.log(err);
        return res.status(400).json({ error: 'Something went wrong!' })
    }
}

module.exports = {
    getRegister,
    postRegister,
    getLogin,
    postLogin,
    getLogout,
    getPasswordResetEmail,
    postPasswordResetEmail,
    getResetPassword,
    postResetPassword
}

