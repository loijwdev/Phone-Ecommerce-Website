const express = require('express');
const router = express.Router();
const multer = require("multer");

const { isAdmin, getStaff, adminPage, editStaff, deleteStaff, lockMember, unlockMember, updateProfilebyAdmin, defaultpassword } = require('../controllers/staffController');
const storage = multer.diskStorage({
  destination: "./src/public/uploads",
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "_" + uniqueSuffix + "_" + file.originalname);
  },
});
const upload = multer({ storage }).single("avt");

router.get('/', isAdmin, getStaff, adminPage);
router.get("/edit/:id", editStaff);
router.post("/update/:id", upload, updateProfilebyAdmin);
router.get("/delete/:id", deleteStaff);
router.get("/lock/:id", lockMember);
router.get("/unlock/:id", unlockMember);
router.get('/defaultpassword/:id', defaultpassword);
module.exports = router;