const express = require('express')
const router = express.Router()

const {addFavorite, removeFavorite, getPage} = require('../../controllers/customer_page/favoriteController')

router.post('/add',addFavorite)
router.post('/remove',removeFavorite)
router.get('/',getPage)
module.exports = router