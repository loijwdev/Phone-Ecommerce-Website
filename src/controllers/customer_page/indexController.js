const Product = require("../../models/product");
const Cart = require("../../models/cart");

const getProductInfo = async (productId) => {
  try {
    const product = await Product.findById(productId).exec();
    if (product) {
      return {
        productName: product.name,
        image: product.image,
        brand: product.brand,
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

const getPage = async (req, res) => {
  let name, _id, carts;
  try {
    if (req.session.customer) {
      name = req.session.customer.name;
      _id = req.session.customer._id;
      carts = await Cart.findOne({
        customerId: req.session.customer._id,
      }).exec();
    }
    const products = await Product.aggregate([{ $sample: { size: 4 } }]); // Lấy ngẫu nhiên 4 sản phẩm

    // Lặp qua từng sản phẩm để tìm giá thấp nhất của mỗi sản phẩm trong capacities
    const productsWithMinPrices = await Promise.all(
      products.map(async (product) => {
        const minPriceColor = product.capacities.reduce(
          (minColor, capacity) => {
            const minCapacityColor = capacity.colors.reduce((min, color) => {
              return color.price < min.price ? color : min;
            }, capacity.colors[0]); // Sử dụng phần tử đầu tiên của mảng colors làm giá trị khởi tạo

            return minCapacityColor.price < minColor.price
              ? minCapacityColor
              : minColor;
          },
          product.capacities[0].colors[0]
        ); // Sử dụng phần tử đầu tiên của mảng capacities[0].colors làm giá trị khởi tạo

        // Trả về sản phẩm với giá thấp nhất của mỗi sản phẩm
        return {
          _id: product._id,
          name: product.name,
          image: product.image,
          brand: product.brand,
          minPrice: minPriceColor.price,
          // Các thông tin khác mà bạn muốn bao gồm trong đây
        };
      })
    );
    let formattedCarts = {};
    if (carts && carts.items) {
      formattedCarts = {
        items: await Promise.all(
          carts.items.map(async (item) => {
            const { productName, image, brand } = await getProductInfo(
              item.productId
            );
            return {
              ...item,
              productName: productName,
              brand: brand,
              image: image,
              id: item.productId,
              price: formatCurrency(item.price),
              quantity: item.quantity,
            };
          })
        ),
      };
    }

    res.render("customer/index", {
      name,
      products: productsWithMinPrices,
      carts: formattedCarts.items || [],
      _id,
      length: carts && carts.items ? carts.items.length : 0,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
};

const formatCurrency = (amount) => {
  const formattedAmount = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
  return formattedAmount;
};


module.exports = { getPage };
