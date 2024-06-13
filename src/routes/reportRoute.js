const express = require('express')
const router = express.Router()
const { getReport,reportDetail, getOrderOfWeek, getAmountOfWeek } = require('../controllers/reportController')
// router.method

router.get('/', getReport)
router.post('/reportDetail', reportDetail)
router.get("/getOrderOfWeek", getOrderOfWeek)
router.get("/getAmountOfWeek", getAmountOfWeek)


module.exports = router
