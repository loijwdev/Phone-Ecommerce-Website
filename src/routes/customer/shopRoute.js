const express = require('express')
const router = express.Router()

const {getShopPage, getProducts} = require('../../controllers/customer_page/shopController')

router.get('/', getProducts)

module.exports = router