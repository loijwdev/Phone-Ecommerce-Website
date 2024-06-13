const express = require('express')
const router = express.Router()

const {getPage, getOrder, cancelOrder} = require('../../controllers/customer_page/checkOrderController')

router.get('/', getPage)
router.post('/getOrder', getOrder)
router.post('/cancelOrder', cancelOrder)
module.exports = router