const moment = require("moment");
const Customer = require("../models/customer");
const Order = require("../models/order");
const Product = require("../models/product");

const createCustomer = async (req, res) => {
  const { name, phone } = req.body;
  try {

    const find = await Customer.findOne({ phone: phone })
    if (!find) {
      const newCustomer = new Customer({
        name,
        phone,
      });
      const savedCustomer = await newCustomer.save();
      res.json({ success: true, customer: savedCustomer });
    } else {
      res.json({ success: false, customer: find });
    }

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// LẤY DANH SÁCH KHÁCH HÀNG
const getCustomers = async (req, res) => {
  try {
    const { name, email, role, state, _id, lastname, firstname, birthday, phone, avt } = req.session.user;

    let { page, pageSize, search } = req.query;

    // Set default values if not provided
    page = page ? parseInt(page, 10) : 1;
    pageSize = pageSize ? parseInt(pageSize, 10) : 5;

    // Create a MongoDB query object based on search criteria
    const query = {};
    if (search) {
      query.name = { $regex: new RegExp(search, "i") }; // Case-insensitive search on the 'name' field
    }

    // Fetch products with pagination and search
    const customers = await Customer.find(query)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .exec();

    const totalCustomers = await Customer.countDocuments(query);

    const totalPages = Math.ceil(totalCustomers / pageSize);

    const pagination = {
      pages: Array.from({ length: totalPages }, (_, i) => ({
        page: i + 1,
        isCurrent: i + 1 === page,
      })),
      pageSize,
      currentPage: page,
      totalCustomers,
    };

    // Include information about the previous and next pages
    if (page > 1) {
      pagination.prevPage = page - 1;
    }

    if (page < totalPages) {
      pagination.nextPage = page + 1;
    }

    const plainCustomers = customers.map((customer) => ({
      ...customer.toJSON(), role
    }));
    res.render("customer", {
      customers: plainCustomers,
      firstname,
      role,
      totalPages,
      search,
      pagination,
      avt
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CHI TIẾT KHÁCH HÀNG
const customerDetail = async (req, res) => {
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
    const order = await Order.find({ customer_id: id })
    const product = await Product.find();

    const plainOrder = order.map((order) => ({
      ...order.toJSON(),
      created: moment(order.created).format("DD/MM/YYYY HH:mm:ss"),
    }));

    var _name

    var detail = []
    plainOrder.forEach(element => {
      var pro = []

      var countPd = 0
      _name = element.customer_name,
        element.products.forEach(idPd => {
          pro.push({
            product_name: idPd.product_name,
            product_id: idPd.product_id,
            quantity: idPd.quantity,
            discount: element.discount,
            unit_price: formatCurrency(idPd.unit_price),
            total_price: formatCurrency(idPd.total_price*(100-element.discount)/100),
            _id: idPd._id
          })
          product.forEach(pro => {
            if (String(idPd.product_id) === String(pro._id)) {
              countPd += idPd.quantity
            }
          });
        });
      detail.push({
        countPd: countPd,
        _id: element._id,
        total_amount: formatCurrency(element.total_amount),
        amount_given: formatCurrency(element.amount_given),
        change_given: formatCurrency(element.change_given),
        created: element.created,
        products: pro,
        order_type: element.order_type
      })
    });
    if (!order) {
      return res.redirect("/customer");
    }
    res.render("customerDetail", {
      order: detail,
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
        _name
    })
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// SỬA THÔNG TIN KHÁCH HÀNG 
const editCustomer = async (req, res) => {
  try {
    const { name, email, role, state, _id, lastname, firstname, birthday, phone } = req.session.user;
    const id = req.params.id;
    const customer = await Customer.findById(id).exec();
    if (!customer) {
      return res.redirect("/customer");
    }
    res.render("editCustomer", {
      customer: customer,
      firstname, role
    });
  } catch (err) {
    console.error(err);
    res.redirect("/customer");
  }
};

// CẬP NHẬT THÔNG TIN KHÁCH HÀNG
const updateCustomer = async (req, res) => {
  try {
    const id = req.params.id;
    const updateCustomer = await Customer.findByIdAndUpdate(id, {
      name: req.body.nameCt,
      phone: req.body.phone,
      address: req.body.address,
    }, { new: true }
    ).exec();
    if (!updateCustomer) {
      throw new Error("Customer not found");
    }

    req.session.message = {
      type: "success",
      message: "Customer updated successfully",
    };
    res.redirect("/customer");
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: err.message,
    };
    res.redirect("/customer");
  }
}

// XÓA KHÁCH HÀNG
const deleteCustomer = async (req, res) => {
  let id = req.params.id;
  Customer.findOneAndDelete({ _id: id })
    .exec()
    .then(() => {
      req.session.message = {
        type: "danger",
        message: "Customer deleted successfully",
      };
      res.redirect("/customer");
    })
    .catch((err) => {
      res.json({ message: err.message });
    });
}

const getAllCustomers = async () => {
  try {
    const customers = await Customer.find().exec();
    const plainCustomers = customers.map((customer) => ({
      ...customer.toJSON(),
    }));
    return plainCustomers;
  } catch (err) {
    throw err
  }
};


const formatCurrency = (amount) => {
  const formattedAmount = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
  return formattedAmount;
};


module.exports = {
  createCustomer,
  getCustomers,
  editCustomer,
  updateCustomer,
  deleteCustomer,
  getAllCustomers,
  customerDetail
};
