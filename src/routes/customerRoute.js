const express = require('express')
const router = express.Router()
const { createCustomer, getCustomers, editCustomer, updateCustomer, deleteCustomer, customerDetail
 } = require('../controllers/customerController')


// router.method

router.get('/', getCustomers)
router.get("/edit/:id",editCustomer)
router.post("/update/:id",updateCustomer)
router.get("/delete/:id",deleteCustomer)
router.post("/createCustomer", createCustomer)
router.get("/customerDetail/:id", customerDetail)





module.exports = router
