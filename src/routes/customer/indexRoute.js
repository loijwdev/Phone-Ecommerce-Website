const express = require('express')
const router = express.Router()

const {getPage} = require('../../controllers/customer_page/indexController')

router.get('/', getPage)

module.exports = router