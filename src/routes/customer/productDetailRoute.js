const express = require('express')
const router = express.Router()

const {getDetailProduct, getColorPriceWithCapacity} = require('../../controllers/customer_page/productDetailController')

router.get('/:id', getDetailProduct)
router.post('/colorPriceWithCapacity', getColorPriceWithCapacity)

module.exports = router