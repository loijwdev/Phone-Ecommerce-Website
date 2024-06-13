const express = require("express");
const router = express.Router();
const { getLink } = require("../controllers/requireLinkControllers");
const {
  checkLink,
  activateAccount,
} = require("../controllers/requireLinkControllers");
const { isAdmin } = require("../controllers/staffController");

router.post("/", checkLink);
router.get("/", isAdmin, getLink);
router.get("/activate", activateAccount);
module.exports = router;
