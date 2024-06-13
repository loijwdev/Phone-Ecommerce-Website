const express = require("express");
const mongoose = require("mongoose");
const moment = require("moment");
const Product = require("../models/product");
const fs = require("fs");
const bwipjs = require("bwip-js");
const Order = require("../models/order");
const Category = require("../models/category");

const getAddProduct = async (req, res) => {
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
  const categories = await Category.find({ active: true }).exec();

  res.render("addProduct", { role, firstname, avt, categories });
};

// const createProduct = async (req, res) => {
//   try {
//     const productUPC = req.body.barcode;
//     const barcodeBase64 = await generateBarcode(productUPC);

//     const product = new Product({
//       image: req.file.filename,
//       name: req.body.namePd,
//       importPrice: req.body.importPrice,
//       retailPrice: req.body.retailPrice,
//       category: req.body.product_category,
//       brand: req.body.brand,
//       barcode: barcodeBase64,
//       barcodeUPC: productUPC,
//       quantityInStock: req.body.quantityInStock
//     });
//     await product.save();
//     req.session.message = {
//       type: "success",
//       message: "Product added successfully",
//     };
//     res.redirect("/product");
//   } catch (err) {
//     console.error(err);
//     req.session.message = {
//       type: "danger",
//       message: err.message,
//     };
//     res.status(500).redirect("/product/addProduct");
//   }
// };

const createProduct = async (req, res) => {
  try {
    const productUPC = req.body.barcode;
    const barcodeBase64 = await generateBarcode(productUPC);
    const capacities2 = req.body.capacities;
    console.log(capacities2);
    const capacities = req.body.capacities
      .map((capacity) => {
        const colors = capacity.colors
          .map((color) => {
            const serialNumbers = [];
            const filteredColor = {
              color: color.color,
              price: color.price,
              quantityInStock: color.quantityInStock,
            };

            if (color.quantityInStock === 0) {
              filteredColor.serialNumbers = [];
            } else {
              for (let i = 0; i < color.quantityInStock; i++) {
                serialNumbers.push(
                  generateSerialNumber(capacity.capacity, color.color, i + 1)
                );
              }
            }
            filteredColor.serialNumbers = serialNumbers;

            return filteredColor;
          })
          .filter(
            (filteredColor) => filteredColor.color && filteredColor.price
          ); // Remove colors without valid data

        return {
          capacity: capacity.capacity,
          colors: colors.length ? colors : null,
        };
      })
      .filter((filteredCapacity) => filteredCapacity.colors !== null); // Remove capacities without valid colors

    const product = new Product({
      image: req.file.filename,
      name: req.body.namePd,
      url_video: req.body.video_url,
      category: req.body.product_category,
      brand: req.body.brand,
      barcode: barcodeBase64,
      barcodeUPC: productUPC,
      description: req.body.description,
      capacities: capacities,
    });

    await product.save();
    req.session.message = {
      type: "success",
      message: "Product added successfully",
    };
    res.redirect("/product");
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: err.message,
    };
    res.status(500).redirect("/product/addProduct");
  }
};

function generateBarcode(productUPC) {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid: "upca",
        text: productUPC,
        scale: 3,
        height: 10,
      },
      function (err, png) {
        if (err) {
          reject(err);
        } else {
          resolve(png.toString("base64"));
        }
      }
    );
  });
}

const formatCurrency = (amount) => {
  const formattedAmount = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
  return formattedAmount;
};

const getProducts = async (req, res) => {
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
    let { page, pageSize, search } = req.query;

    // Set default values if not provided
    page = page ? parseInt(page, 10) : 1;
    pageSize = pageSize ? parseInt(pageSize, 10) : 7;

    // Create a MongoDB query object based on search criteria
    const query = {};
    if (search) {
      query.name = { $regex: new RegExp(search, "i") }; // Case-insensitive search on the 'name' field
    }

    // Fetch products with pagination and search
    const products = await Product.find(query)
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

    const plainProducts = products.map((product) => ({
      ...product.toJSON(),
      created: moment(product.created).format("DD/MM/YYYY HH:mm:ss"),
      importPrice: formatCurrency(product.importPrice),
      retailPrice: formatCurrency(product.retailPrice),
      role,
    }));

    res.render("product", {
      products: plainProducts,
      firstname,
      role,
      totalPages,
      search,
      pagination,
      avt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const editProduct = async (req, res) => {
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
    const id = req.params.id;
    const product = await Product.findOne({ _id: id }).exec();

    if (!product) {
      return res.redirect("/product");
    }
    const categories = await Category.find({ active: true }).exec();

    res.render("editProduct", {
      product: product,
      categories,
      firstname,
      role,
      avt,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/product");
  }
};

const updateProduct = async (req, res) => {
  const id = req.params.id;
  const newImage = req.file ? req.file.filename : req.body.old_image;
  const capacities = req.body.capacities
    .map((capacity) => {
      const colors = capacity.colors
        .map((color) => {
          // Kiểm tra xem trường nào không có giá trị và bỏ qua
          const serialNumbers = [];
          const filteredColor = {};
          if (color.color) filteredColor.color = color.color;
          if (color.price) filteredColor.price = color.price;
          if (color.quantityInStock || color.quantityInStock === 0) {
            // Ensure that quantityInStock is either defined or explicitly set to 0
            filteredColor.quantityInStock = color.quantityInStock;
            if (color.quantityInStock === 0) {
              // Set serialNumbers to an empty array if quantityInStock is 0
              filteredColor.serialNumbers = [];
            } else {
              // Generate serial numbers regardless of quantityInStock
              for (let i = 0; i < color.quantityInStock; i++) {
                serialNumbers.push(
                  generateSerialNumber(capacity.capacity, color.color, i + 1)
                );
              }
              filteredColor.serialNumbers = serialNumbers;
            }
          }
          // if (color.quantityInStock)
          //   filteredColor.quantityInStock = color.quantityInStock;
          //   if (color.quantityInStock === 0) {
          //     serialNumbers.push('XXX0');
          //   } else {
          //     for (let i = 0; i < color.quantityInStock; i++) {
          //       serialNumbers.push(
          //         generateSerialNumber(capacity.capacity, color.color, i + 1)
          //       );
          //     }
          //   }
          console.log(serialNumbers);
          // filteredColor.serialNumbers = serialNumbers;
          if (serialNumbers.length > 0) {
            filteredColor.serialNumbers = serialNumbers;
          }
          // Tạo đối tượng màu sắc chỉ với các trường có giá trị

          return filteredColor;
        })
        .filter((filteredColor) => filteredColor.color && filteredColor.price); // Loại bỏ các màu không có giá trị

      // Kiểm tra xem màu nào có dữ liệu và bỏ qua
      if (colors.length === 0) return null;

      // Tạo đối tượng dung lượng chỉ với các trường có giá trị
      return {
        capacity: capacity.capacity,
        colors: colors,
      };
    })
    .filter((filteredCapacity) => filteredCapacity !== null);

  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        name: req.body.namePd,
        category: req.body.product_category,
        image: newImage,
        brand: req.body.brand,
        barcodeUPC: req.body.barcode,
        url_video: req.body.video_url,
        description: req.body.description,
        capacities: capacities,
      },
      { new: true }
    );

    if (!updatedProduct) {
      throw new Error("Product not found");
    }

    if (req.file) {
      try {
        fs.unlinkSync(`./src/public/uploads/${req.body.old_image}`);
      } catch (err) {
        console.log(err);
      }
    }

    req.session.message = {
      type: "success",
      message: "Product updated successfully",
    };
    res.redirect("/product");
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: err.message,
    };
    res.redirect("/product");
  }
};

const deleteProduct = async (req, res) => {
  let id = req.params.id;

  try {
    // Check if the product is associated with any order
    const isInOrder = await Order.exists({ "products.product_id": id });

    if (isInOrder) {
      // Product is in an order, cannot delete
      req.session.message = {
        type: "danger",
        message: "Không thể xóa sản phẩm",
      };
      res.redirect("/product");
      return;
    }

    // Product is not in any order, proceed with deletion
    const result = await Product.findOneAndDelete({ _id: id }).exec();

    if (result && result.image !== "") {
      try {
        fs.unlinkSync("./src/public/uploads/" + result.image);
        console.log("Image deleted:", result.image);
      } catch (err) {
        console.log("Error deleting image:", err);
      }
    }

    req.session.message = {
      type: "danger",
      message: "Product deleted successfully",
    };

    res.redirect("/product");
  } catch (err) {
    res.json({ message: err.message });
  }
};

const getAllProducts = async () => {
  try {
    const products = await Product.find().exec();
    const plainProducts = products.map((product) => ({
      ...product.toJSON(),
      created: moment(product.created).format("DD/MM/YYYY HH:mm:ss"),
      retailPriceFormatted: new Intl.NumberFormat("vi-VN").format(
        product.retailPrice
      ),
    }));
    return plainProducts;
  } catch (err) {
    throw err;
  }
};

const generateRandomString = (length) => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const generateSerialNumber = (capacity, color, index) => {
  const prefix = color.substring(0, 1).toUpperCase();
  const capacityCode = capacity;
  const randomString = generateRandomString(5);
  const serialNumber = `${prefix}${capacityCode}${index
    .toString()
    .padStart(3, "0")}${randomString}`;
  return serialNumber;
};

const getOptionProduct = async (req, res) => {
  const id = req.body.id;
  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const capacities = product.capacities;
    return res.json(capacities);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getAddProduct,
  getProducts,
  editProduct,
  updateProduct,
  deleteProduct,
  getOptionProduct
};
