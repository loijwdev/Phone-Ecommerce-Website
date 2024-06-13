const express = require('express')
const router = express.Router()
const { logout } = require('../controllers/logoutController')

// router
router.get('/', logout);  
module.exports = router
