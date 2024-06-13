const Order = require("../models/order");

const getHome = async (req, res) => {
  if (req.session.user) {
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
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const query = { created: { $gte: twentyFourHoursAgo }, order_status: 'completed' };

    try {
      const orders = await Order.find(query).sort({ created: -1 });
      console.log(orders);
      const totalRevenue = orders.reduce(
        (acc, order) => acc + order.total_amount,
        0
      );
      const totalProductsSold = orders.reduce(
        (acc, order) => acc + order.products.length,
        0
      );
      const totalOrders = orders.length;

      res.render("home", {
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
        totalRevenue: formatCurrency(totalRevenue),
        totalProductsSold,
        totalOrders,
      });
    } catch (error) {
      console.error("Error fetching orders:", error);
      res
        .status(500)
        .json({ error: "An error occurred while fetching orders." });
    }
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
  getHome,
};
