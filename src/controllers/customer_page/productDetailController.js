const Product = require("../../models/product");
const Cart = require("../../models/cart");
const Favorite = require("../../models/favorite");

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

const getDetailProduct = async (req, res) => {
  let carts = {};
  const id = req.params.id;
  let favorites = {};
  let isFavorite;
  let name;
  const product = await Product.findById(id);
  product.description.replace(/\n/g, "<br>");
  if (req.session.customer) {
    carts = await Cart.findOne({
      customerId: req.session.customer._id,
    }).exec();
    name = req.session.customer.name;
    favorites = await Favorite.findOne({ customerId: req.session.customer._id }).exec();
    isFavorite = favorites && favorites.productIds.includes(id);
  }
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
            price: item.price,
            quantity: item.quantity,
            color: item.color,
            capacity: item.capacity,
          };
        })
      ),
    };
  }

  const minPriceColor = product.capacities.reduce((minColor, capacity) => {
    const minCapacityColor = capacity.colors.reduce((min, color) => {
      return color.price < min.price ? color : min;
    }, capacity.colors[0]); // Khởi tạo giá trị ban đầu là phần tử đầu tiên của mảng colors
    return minCapacityColor.price < minColor.price
      ? minCapacityColor
      : minColor;
  }, product.capacities[0].colors[0]);

  const minPriceCapacity = product.capacities.reduce(
    (minCapacity, capacity) => {
      const minCapacityColor = capacity.colors.reduce((min, color) => {
        return color.price < min.price ? color : min;
      }, capacity.colors[0]); // Initialize with the first color of the current capacity

      if (minCapacityColor.price < minCapacity.color.price) {
        return { color: minCapacityColor, capacity: capacity }; // Return the current capacity and its cheapest color
      } else {
        return minCapacity; // Otherwise, return the cheapest found so far
      }
    },
    { color: product.capacities[0].colors[0], capacity: product.capacities[0] }
  );

  const capacitiesWithMinPrice = product.capacities.map((capacity) => {
    const minPriceColor = capacity.colors.reduce((min, color) => {
      return color.price < min.price ? color : min;
    }, capacity.colors[0]); // Initialize with the first color of the current capacity

    return { ...capacity._doc, minPriceColor }; // Return the current capacity and its cheapest color
  });

  const capacitiesWithColors = product.capacities.map((capacity) => {
    const colorsWithPrice = capacity.colors.map((color) => {
      return {
        color: color.color,
        price: color.price,
      };
    });
    return {
      capacity: capacity.capacity,
      colorsWithPrice: colorsWithPrice,
    };
  });



  res.render("customer/single-product-details", {
    product: product,
    isFavorite,
    minPriceColor: minPriceColor,
    minPriceCapacity: minPriceCapacity,
    capacitiesWithMinPrice: capacitiesWithMinPrice,
    capacitiesWithColors: capacitiesWithColors,
    carts: formattedCarts.items || [],
    length: carts && carts.items ? carts.items.length : 0,
    name,
  });
};

const getColorPriceWithCapacity = async (req, res) => {
  try {
    const productId = req.body.productId; // Lấy productId từ request parameter
    const capacity = req.body.capacity; // Lấy dung lượng từ query parameter
    // Kiểm tra xem productId và capacity có tồn tại không
    if (!productId || !capacity) {
      return res.status(400).json({ message: 'Missing productId or capacity' });
    }

    // Tìm sản phẩm trong cơ sở dữ liệu bằng productId
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Tìm dung lượng (capacity) tương ứng trong mảng capacities của sản phẩm
    const targetCapacity = product.capacities.find(item => item.capacity === capacity);
    if (!targetCapacity) {
      return res.status(404).json({ message: 'Capacity not found' });
    }
    const colorsWithPrice = targetCapacity.colors.map(color => ({
      color: color.color,
      price: color.price,
      quantityInStock: color.quantityInStock
    }));
    res.status(200).json({ colorsWithPrice });
  } catch (error) {
    // Xử lý lỗi nếu có
    console.error('Error in getColorPriceWithCapacity:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};




module.exports = { getDetailProduct, getColorPriceWithCapacity };
