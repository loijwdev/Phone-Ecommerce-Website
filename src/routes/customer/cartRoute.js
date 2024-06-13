const express = require('express')
const router = express.Router()

const {addCart, deleteCartItem, updateCartItemQuantity} = require('../../controllers/customer_page/cartController')

router.post('/add',addCart)
router.delete('/delete',deleteCartItem)
router.put('/updateQuantity',updateCartItemQuantity)
module.exports = router