const Product = require("../../models/product");
const Category = require("../../models/category");
const Cart = require("../../models/cart");
const Favorite = require("../../models/favorite");
const getShopPage = (req, res) => {
  res.render("customer/shop");
};

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

const getProducts = async (req, res) => {
  try {
    let name, _id, carts, favorite ,favorites = [];
    if (req.session.customer) {
      name = req.session.customer.name;
      _id = req.session.customer._id;
        [carts, favorite] = await Promise.all([
        Cart.findOne({ customerId: _id }).exec(),
        Favorite.findOne({ customerId: _id }).exec()
      ]);
      if (favorite) {
        favorites = favorite.productIds;
      }
    }
    let { page, pageSize, search, category, brand, sort_price } = req.query;

    page = page ? parseInt(page, 10) : 1;
    pageSize = pageSize ? parseInt(pageSize, 10) : 12;

    const query = {};
    if (search) {
      query.name = { $regex: new RegExp(search, "i") };
    }
    if (category) {
      query.category = category;
    }
    if (brand) {
      query.brand = brand;
    }

    // Sắp xếp theo giá
    let sortOption = {};
    if (sort_price === "asc") {
      sortOption = { retailPrice: 1 }; // Sắp xếp tăng dần theo giá
    } else if (sort_price === "desc") {
      sortOption = { retailPrice: -1 }; // Sắp xếp giảm dần theo giá
    }

    // Fetch products with pagination, search, and sorting
    const products = await Product.find(query)
      .sort(sortOption)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .exec();

    const totalProducts = await Product.countDocuments(query);

    const totalPages = Math.ceil(totalProducts / pageSize);

    const pagination = {
      pages: Array.from({ length: totalPages }, (_, i) => ({
        page: i + 1,
        isCurrent: i + 1 === page,
      })),
      pageSize,
      currentPage: page,
      totalProducts,
    };

    // Include information about the previous and next pages
    if (page > 1) {
      pagination.prevPage = page - 1;
    }

    if (page < totalPages) {
      pagination.nextPage = page + 1;
    }

    const plainProducts = await Promise.all(products.map(async (product) => {
      const minPriceColor = product.capacities.reduce((minColor, capacity) => {
        const minCapacityColor = capacity.colors.reduce((min, color) => {
          return color.price < min.price ? color : min;
        }, capacity.colors[0]); 
        return minCapacityColor.price < minColor.price ? minCapacityColor : minColor;
      }, product.capacities[0].colors[0]);

      return {
        ...product.toJSON(),
        minPriceColor: minPriceColor.price,
        isFavorite: favorites.includes(product._id.toString()),
      };
    }));
    const categories = await Category.find({ active: true }).exec();
    const brands = await Product.distinct("brand");
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


    res.render("customer/shop", {
      products: plainProducts,
      categories,
      totalPages,
      search,
      pagination,
      name,
      carts: formattedCarts.items || [],
      _id,
      length: carts && carts.items ? carts.items.length : 0,
      brands,
    });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: err.message });
  }
};


const formatCurrency = (amount) => {
  const formattedAmount = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
  return formattedAmount;
};

module.exports = { getShopPage, getProducts };
