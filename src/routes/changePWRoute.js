const express = require('express')
const router = express.Router()
const { getChangePW } = require('../controllers/ChangePWController')
const { changePW } = require('../controllers/ChangePWController')

// router.method

router.get('/', getChangePW)
router.post('/', changePW);

module.exports = router
