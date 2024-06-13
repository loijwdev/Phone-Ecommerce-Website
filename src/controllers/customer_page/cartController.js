const Cart = require("../../models/cart");
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

const addCart = async (req, res) => {
  try {
    if (!req.session.customer) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { productId, quantity, price, selectedCapacity, selectedColor } =
      req.body;
    const customerId = req.session.customer._id;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(402).json({ message: "Product not found" });
    }

    const capacity = product.capacities.find(
      (capacity) => capacity.capacity === selectedCapacity
    );
    // Find the selected color in the selected capacity
    const color = capacity.colors.find(
      (color) => color.color === selectedColor
    );
    // Check if there is enough stock for the selected color
    if (color.quantityInStock < quantity) {
      return res
        .status(400)
        .json({ message: "Not enough stock for the selected color" });
    }

    let cart = await Cart.findOne({ customerId });
    if (!cart) {
      cart = new Cart({ customerId: customerId, items: [] });
    }
    //check existing item in cart

    const existingItem = cart.items.find(
      (item) =>
        item.productId.equals(productId) &&
        item.color === selectedColor &&
        item.capacity === selectedCapacity
    );

    if (existingItem) {
      if (color.quantityInStock < existingItem.quantity + quantity) {
        return res.status(400).json({ message: "Sản phẩm đã hết hàng" });
      }
      existingItem.quantity += quantity;
    } else {
      if (color.quantityInStock < quantity) {
        return res.status(400).json({ message: "Sản phẩm đã hết hàng" });
      }
      cart.items.push({
        productId,
        quantity,
        price,
        color: selectedColor,
        capacity: selectedCapacity,
      });
    }

    await cart.save();

    const formattedCarts = {
      items: await Promise.all(
        cart.items.map(async (item) => {
          const { productName, image, brand, id } = await getProductInfo(
            item.productId
          );
          return {
            ...item,
            productName: productName,
            brand: brand,
            image: image,
            id: id,
            price: formatCurrency(item.price),
            quantity: item.quantity,
            color: item.color,
            capacity: item.capacity,
          };
        })
      ),
    };
    res.status(200).json({
      message: "Product added to cart successfully",
      cart: formattedCarts,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteCartItem = async (req, res) => {
  try {
    const { productId } = req.body;
    const customerId = req.session.customer._id;
    let cart = await Cart.findOne({ customerId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    const itemIndex = cart.items.findIndex((item) =>
      item.productId.equals(productId)
    );
    if (itemIndex > -1) {
      cart.items.splice(itemIndex, 1);
      await cart.save();
      res.status(200).json({
        message: "Product removed from cart successfully",
        cart: cart.items,
      });
    } else {
      res.status(404).json({ message: "Product not found in cart" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateCartItemQuantity = async (req, res) => {
  try {
    const { productId, quantityElement } = req.body;
    const selectedColor = req.body.color;
    const selectedCapacity = req.body.capacity;
    const customerId = req.session.customer._id;
    // Fetch the product from the database
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const capacity = product.capacities.find(
      (capacity) => capacity.capacity === selectedCapacity
    );
    // Find the selected color in the selected capacity
    const color = capacity.colors.find(
      (color) => color.color === selectedColor
    );

    let cart = await Cart.findOne({ customerId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    const item = cart.items.find((item) => item.productId.equals(productId) && item.color === selectedColor && item.capacity === selectedCapacity);

    if (!item) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    // Check if there is enough stock
    if (color.quantityInStock < quantityElement) {
      return res.status(400).json({
        message: "Sản phẩm đã hết",
        quantityInStock: color.quantityInStock,
      });
    }

    item.quantity = quantityElement;

    await cart.save();
    res.status(200).json({
      message: "Product quantity updated successfully",
      cart: cart.items,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const formatCurrency = (amount) => {
  const formattedAmount = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
  return formattedAmount;
};

module.exports = { addCart, deleteCartItem, updateCartItemQuantity };
