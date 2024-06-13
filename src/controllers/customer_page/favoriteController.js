const Favorite = require("../../models/favorite");
const Product = require("../../models/product");
const getProductInfo = async (productId) => {
  try {
    const product = await Product.findById(productId).exec();
    if (product) {
      return {
        productName: product.name,
        image: product.image,
        brand: product.brand,
        id: product._id,
      };
    } else {
      console.error("Product not found");
      return {
        productName: "Unknown Product",
        image: "Unknown Image URL",
        brand: "Unknown Brand",
        id: "Unknown ID",
      };
    }
  } catch (error) {
    console.error("Error fetching product info:", error.message);
    return {
      productName: "Unknown Product",
      image: "Unknown Image URL",
      brand: "Unknown Brand",
    };
  }
};

const getPage = async (req, res) => {
  try {
    let name, _id;
    if (req.session.customer) {
      name = req.session.customer.name;
      _id = req.session.customer._id;
    }
    const favorite = await Favorite.findOne({
      customerId: req.session.customer._id,
    }).exec();
    if (favorite) {
      const productIds = favorite.productIds;
      const products = await Promise.all(
        productIds.map(async (productId) => {
          return await getProductInfo(productId);
        })
      );
      res.render("customer/favorite", { products, name });
    } else {
      res.render("customer/favorite", { products: [], name });
    }
  } catch (error) {
    console.error("Error fetching favorite products:", error.message);
    res.status(500).json({ message: error.message });
  }
};
const addFavorite = async (req, res) => {
  try {
    if (!req.session.customer) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { productId } = req.body;
    const customerId = req.session.customer._id;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(402).json({ message: "Product not found" });
    }

    let favorite = await Favorite.findOne({ customerId });
    if (!favorite) {
      favorite = new Favorite({
        customerId,
        productIds: [productId],
      });
    } else {
      favorite.productIds.push(productId);
    }
    await favorite.save();
    return res.status(200).json({ message: "Product added to favorite" });
  } catch (error) {
    console.error("Error adding favorite:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const removeFavorite = async (req, res) => {
  try {
    if (!req.session.customer) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { productId } = req.body;
    const customerId = req.session.customer._id;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(402).json({ message: "Product not found" });
    }

    let favorite = await Favorite.findOne({ customerId });
    if (!favorite) {
      return res.status(403).json({ message: "Favorite not found" });
    }
    favorite.productIds = favorite.productIds.filter((id) => id != productId);
    await favorite.save();
    return res
      .status(200)
      .json({ success: true, message: "Product removed from favorite" });
  } catch (error) {
    console.error("Error removing favorite:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { addFavorite, removeFavorite, getPage };
