const express = require("express");
const router = express.Router();
const { getSignUp } = require("../controllers/signUpController");
const {
  checkSignup,
  activateAccount,
} = require("../controllers/signUpController");
const { isAdmin } = require("../controllers/staffController");
router.post("/", checkSignup);
router.get("/", isAdmin, getSignUp);
router.get("/activate", activateAccount);
module.exports = router;
