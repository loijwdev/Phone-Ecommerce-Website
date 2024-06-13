const express = require('express');
const router = express.Router();
const multer = require("multer");
const storage = multer.diskStorage({
  destination: "./src/public/uploads",
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "_" + uniqueSuffix + "_" + file.originalname);
  },
});
const upload = multer({ storage }).single("avt");
const {
  getProfile,
  showUserInfo,
  updateProfile,
  editProfile,
} = require('../controllers/profileController');


router.get("/edit/:id", editProfile);
router.post("/update/:id",upload, updateProfile);
router.get('/', showUserInfo);
module.exports = router;