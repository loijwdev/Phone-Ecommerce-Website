const express = require('express');
const router = express.Router();
const { getLogin, check } = require('../controllers/loginController');


router.get('/', getLogin);
router.post('/', check);

module.exports = router;