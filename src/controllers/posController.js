const { getAllProducts } = require("../controllers/productController");
const { getAllCustomers } = require("../controllers/customerController");
const Customer = require("../models/customer");
const product = require("../models/product");
const Category = require("../models/category");

const getPos = async (req, res) => {
  try {
    const {
      name,
      email,
      role,
      state,
      _id,
      lastname,
      firstname,
      birthday,
      phone,
      avt,
    } = req.session.user;
    const products = await getAllProducts();
    const customers = await getAllCustomers();
    const categories = await Category.find({ active: true }).exec();

    res.render("pos", { products, customers, role, firstname, avt, categories });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error rendering POS page");
  }
};

let shoppingCart = [];
const addToCart = (req, res) => {
  const { productName, productPrice, productId } = req.body;
  shoppingCart.push({ productName, productPrice, productId });
  res.json({ message: "Product added to cart" });
};

const getCart = (req, res) => {
  res.json(shoppingCart);
};

const clearCart = (req, res) => {
  shoppingCart = [];
  res.json({ message: "Cart cleared" });
};

const removeFromCart = (req, res) => {
  const { productName } = req.body;
  const index = shoppingCart.findIndex(
    (item) => item.productName === productName
  );

  if (index !== -1) {
    shoppingCart.splice(index, 1);
    res.json({ success: true, message: "Product removed from cart" });
  } else {
    res.json({ success: false, message: "Product not found in cart" });
  }
};

const getCus = async (req, res) => {
  try {
    let payload = req.body.payload;
    let search = await Customer.find({
      phone: { $regex: new RegExp(payload) },
    }).exec();
    search = search.slice(0, 5);
    res.send({ payload: search });
  } catch (error) {
    res.status(500).send({ error: "Lỗi truy vấn dữ liệu khách hàng" });
  }
};

const getProduct = async (req, res) => {
  try {
    let payload = req.body.payload;
    let search;
    // If payload is empty, return all products
    if (!payload || payload === "") {
      search = await product.find().exec();
    } else {
      // If it's a number, search by each digit
      if (/^\d+$/.test(payload)) {
        const regexArray = payload.split("").map((char) => `.*${char}`);
        const regexString = regexArray.join("");
        search = await product
          .find({ barcodeUPC: { $regex: new RegExp(regexString, "i") } })
          .exec();
          search = search.slice(0, 8);  
      } else {
        // If it's not a number, search by each character of the name
        const regexArray = payload.split("").map((char) => `.*${char}`);
        const regexString = regexArray.join("");
        search = await product
          .find({ name: { $regex: new RegExp(regexString, "i") } })
          .exec();
          search = search.slice(0, 8);
      }
    }

    
    res.send({ payload: search });
  } catch (error) {
    res.status(500).send({ error: "Lỗi" });
  }
};

const getCategory = async (req, res) => {
  const selectedCategory = req.query.poscat;

  try {
    let query = {};
    if (selectedCategory !== "all") {
      query = { category: selectedCategory };
    }
    const products = await product.find(query);
    res.json({ products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
module.exports = {
  getPos,
  addToCart,
  getCart,
  clearCart,
  removeFromCart,
  getCus,
  getProduct,
  getCategory,
};
