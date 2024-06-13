const express = require('express')
const router = express.Router()

const {getPage, signUp, activateAccount, login, logout} = require('../../controllers/customer_page/authController')

router.get('/auth',getPage)
router.post('/signup',signUp)
router.get('/auth/activate',activateAccount)
router.post('/login',login)

router.get('/logout',logout)
module.exports = router