const express = require("express");
const router = express.Router();
const multer = require("multer");
const { isAdmin} = require('../controllers/staffController');

const {
getAddProduct, createProduct,getProducts, editProduct, updateProduct, deleteProduct, getOptionProduct
} = require("../controllers/productController");


const storage = multer.diskStorage({
  destination: "./src/public/uploads",
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "_" + uniqueSuffix + "_" + file.originalname);
  },
});
const upload = multer({ storage }).single("imgPd");

router.get("/", getProducts);
router.get("/addProduct",isAdmin, getAddProduct);
router.post("/addProduct",isAdmin,upload,createProduct)
router.get("/edit/:id",isAdmin,editProduct)
router.post("/update/:id",isAdmin, upload, updateProduct)
router.get("/delete/:id",isAdmin,deleteProduct)
router.post("/option",getOptionProduct)

module.exports = router;
