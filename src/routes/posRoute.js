const express = require('express')
const router = express.Router()
const { getPos, addToCart, getCart, clearCart, removeFromCart, getCus, getProduct, getCategory } = require('../controllers/posController')
// router.method

router.get('/', getPos)
router.post('/addToCart', addToCart);
router.post('/clearCart', clearCart);
router.get('/getCart', getCart)
router.post('/removeFromCart', removeFromCart);
router.post('/getCus', getCus);
router.post('/getProduct', getProduct);
router.post('/search', getCategory);

module.exports = router
