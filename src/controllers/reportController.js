const moment = require("moment");
const Order = require("../models/order");
const Product = require("../models/product");
const Customer = require("../models/customer");

const getReport = async (req, res) => {
  try {
    const count_customer = await Customer.find().count();
    const count_product = await Product.find().count();
    const count_Oder = await Order.find({order_status: { $ne: 'canceled' }}).count();
    const totalOder = await Order.find({ order_status: "completed" });

    const date = await searchDate("today", "", "");
    const input = date[0];
    const inputNext = date[1];
    var total_money = 0;
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
      avt
    } = req.session.user;

    const order = await Order.find({
      created: { $gte: input, $lte: inputNext },
    });

    const count_order = await Order.find({
      created: { $gte: input, $lte: inputNext },
    }).count();

    const plainOrder = totalOder.map((totalOder) => ({ ...totalOder.toJSON() }));

    plainOrder.forEach((element) => {
      total_money += element.total_amount;
    });

    total_money = formatCurrency(total_money)

    const product = await Product.find();

    const name_product = [];
    product.forEach((element) => {
      var name = element.name.split("-");
      name[0] = String(name[0]);
      name_product.push(name[0]);
    });

    res.render("report", {
      count_order: count_Oder,
      count_customer: count_customer,
      count_product: count_product,
      total_money: total_money,
      name_product: name_product,
      firstname,
      role,
      avt
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const reportDetail = async (req, res) => {
  try {
    const date = await searchDate(
      req.body.select,
      req.body.input,
      req.body.output
    );
    const { name, email, role, state, _id, lastname, firstname, birthday, phone, avt} = req.session.user;
    const input = date[0];
    const inputNext = date[1];
    const output = date[2];
    var elementOrder = [];

    // var order = await Order.find({ created: { $gte: input, $lte: inputNext } });
    
    let query = {
      created: { $gte: input, $lte: inputNext }, order_status: 'completed'
    };
    
    if (req.body.order_type && req.body.order_type !== 'all') {
      query.order_type = req.body.order_type;
    }
    
    var order = await Order.find(query);

    const plainOrder = order.map((order) => ({
      ...order.toJSON(),
      created: moment(order.created).format("DD/MM/YYYY"),
    }));

    plainOrder.forEach((element) => {
      const checkCreated = elementOrder.filter(
        (created) => created.created === element.created
      );
      if (checkCreated.length == 0) {
        elementOrder.push({
          _id: [
            {
              idOrderInDay: element._id,
              discount: element.discount,
              products: [{ productOrderInday: element.products }],
            },
          ],
          created: element.created,
          order_type: element.order_type
        });
      } else {
        elementOrder.forEach((idOrder) => { 
          if (idOrder.created === element.created) {
            idOrder._id.push({
              idOrderInDay: element._id,
              discount: element.discount,
              products: [{ productOrderInday: element.products }],
            });
          }

        });
      }
    });

    var pd = await Product.find();

    const plainPd = pd.map((pd) => ({
      ...pd.toJSON(),
    }));

    var overview = [];
    var detailOrderInDay = [];
    var countId = 0
    elementOrder.forEach((id) => {
      var sumProductInDay = 0;
      var sumMoneyInday = 0;
      detailOrderInDay = []
      countId += 1
      id._id.forEach((products) => {
        var changeId = 0
        products.products.forEach((product) => {
          product.productOrderInday.forEach((sum) => {
            sumProductInDay += sum.quantity;
            sumMoneyInday += sum.total_price*((100-products.discount)/100);
            plainPd.forEach((element) => {
              if (String(element._id) === String(sum.product_id)) {
                if (changeId == 0) {
                  detailOrderInDay.push({
                    idInday: products.idOrderInDay,
                    detailOfIdInDay: [{
                      barcode: element.barcode,
                      name: element.name,
                      pd_id: sum.product_id,
                      quantity: sum.quantity,
                      discount: products.discount,
                      unit_price: formatCurrency(sum.unit_price),
                      total_price: formatCurrency(sum.total_price),
                    }]
                  });
                  changeId += 1
                } else if (changeId != 0) {
                  detailOrderInDay.forEach(addPdOfIdInDay => {
                    addPdOfIdInDay.detailOfIdInDay.push({
                      barcode: element.barcode,
                      name: element.name,
                      pd_id: sum.product_id,
                      quantity: sum.quantity,
                      discount: products.discount,
                      unit_price: formatCurrency(sum.unit_price),
                      total_price: formatCurrency(sum.total_price),
                    })
                  });
                }
              }
            });
          });
        });
      });

      overview.push({
        countId: countId,
        created: id.created,
        sumOrderInday: id._id.length,
        sumProductInDay: sumProductInDay,
        sumMoneyInday: formatCurrency(sumMoneyInday),
        sumMoneyInday1: sumMoneyInday,
        detailOrderInDay: detailOrderInDay,
        order_type: id.order_type
      });
    });



    var total = [];
    var totalMoney = 0;
    var totalOrder = 0;
    var totalProduct = 0;

    overview.forEach((element) => {
      totalMoney += element.sumMoneyInday1;
      totalOrder += element.sumOrderInday;
      totalProduct += element.sumProductInDay;
    });

    total.push({
      totalMoney: formatCurrency(totalMoney),
      totalOrder: totalOrder,
      totalProduct: totalProduct,
    });

    res.render("reportDetail", {
      date: date,
      input: input,
      output: output,
      order: overview,
      total: total,
      detailOrderInDay: detailOrderInDay,
      firstname,
      role,
      avt
    });
  } catch (err) {
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

function checkDate(date, option) {
  const d = date.split("-");
  d[0] = parseInt(d[0]);
  d[1] = parseInt(d[1]);
  d[2] = parseInt(d[2]);
  var check = Boolean;
  if ((d[0] % 4 == 0 && d[0] % 100 != 0) || d[0] % 400 == 0) {
    check = true;
  } else {
    check = false;
  }

  if (option == "today") {
    if (
      d[1] == 3 ||
      d[1] == 5 ||
      d[1] == 7 ||
      d[1] == 8 ||
      d[1] == 10 ||
      d[1] == 12
    ) {
      if (d[2] != 31) {
        d[2] += 1;
      } else {
        if (d[1] == 12) {
          d[0] += 1;
          d[1] = 1;
          d[2] = 1;
        } else {
          d[1] += 1;
          d[2] = 1;
        }
      }
    } else if (d[1] == 2) {
      if (check) {
        if (d[2] != 29) {
          d[2] += 1;
        } else {
          d[1] = 3;
          d[2] = 1;
        }
      } else {
        if (d[2] != 28) {
          d[2] += 1;
        } else {
          d[1] = 3;
          d[2] = 1;
        }
      }
    } else {
      if (d[2] != 30) {
        d[2] += 1;
      } else {
        d[1] += 1;
        d[2] = 1;
      }
    }
  } else if (option == "yesterday") {
    if (
      d[1] == 3 ||
      d[1] == 5 ||
      d[1] == 7 ||
      d[1] == 8 ||
      d[1] == 10 ||
      d[1] == 12
    ) {
      if (d[1] == 3 && d[2] == 1) {
        if (check) {
          d[1] = 2;
          d[2] = 29;
        } else {
          d[1] = 2;
          d[2] = 28;
        }
      } else if (d[2] == 1 && d[1] != 3) {
        d[1] -= 1;
        d[2] = 30;
      } else {
        d[2] -= 1;
      }
    } else if (d[1] == 2) {
      if (d[2] == 1) {
        d[1] = 1;
        d[2] = 31;
      } else {
        d[2] -= 1;
      }
    } else {
      if (d[1] != 1 && d[2] == 1) {
        d[1] -= 1;
        d[2] = 31;
      } else if (d[1] == 1 && d[2] == 1) {
        d[0] -= 1;
        d[1] = 12;
        d[2] = 31;
      } else {
        d[2] -= 1;
      }
    }
  }
  d[0] = String(d[0]);
  d[1] = String(d[1]);
  d[2] = String(d[2]);
  if (d[1] < 10) {
    d[1] = 0 + d[1];
  }
  if (d[2] < 10) {
    d[2] = 0 + d[2];
  }
  const inputNext = d[0] + "-" + d[1] + "-" + d[2];
  return inputNext;
}

function searchDate(select, input, output) {
  var date = new Date();
  var m_date = date.getMonth() + 1;
  var y_date = date.getFullYear();
  var today = moment(date).format("YYYY-MM-DD");
  if (select == "today" ||(input === "" && output ==="")) {
    const tomorrow = checkDate(today, "today");
    date = [today, tomorrow, today];
    return date;
  } else if (select == "yesterday") {
    var yesterday = checkDate(today, "yesterday");
    date = [yesterday, today, yesterday];
    return date;
  } else if (select == "week") {
    const startOfWeek = moment(date).startOf("isoweek").format("YYYY-MM-DD");
    const endOfWeek = moment(date).endOf("isoweek").format("YYYY-MM-DD");
    const startOfNextWeek = moment(date)
      .startOf("isoweek")
      .add(1, "week")
      .format("YYYY-MM-DD");
    const week = [startOfWeek, startOfNextWeek, endOfWeek];
    return week;
  } else if (select == "month") {
    // const startMonth = moment(date).format("YYYY-MM-01");
    // var endMonth = "";
    // if (m_date == "12") {
    //   var startNextMont = (y_date + 1) + "-" + "01" + "-" + "01";
    // } else {
    //   var startNextMont = y_date + "-" + (m_date + 1) + "-" + "01";
    // }
    // if (m_date == "02") {
    //   endMonth = y_date + "-" + m_date + "-" + "28";
    // } else if (
    //   m_date == "03" ||
    //   m_date == "05" ||
    //   m_date == "07" ||
    //   m_date == "08" ||
    //   m_date == "10" ||
    //   m_date == "12"
    // ) {
    //   endMonth = y_date + "-" + m_date + "-" + "31";
    // } else {
    //   endMonth = y_date + "-" + m_date + "-" + "30";
    // }
    // date = [startMonth, startNextMont, endMonth];
    // return date;
    const startMonth = moment(date).startOf("month").format("YYYY-MM-DD");
    const endMonth = moment(date).endOf("month").format("YYYY-MM-DD");
    const startNextMonth = moment(date)
      .startOf("month")
      .add(1, "month")
      .format("YYYY-MM-DD");
    date = [startMonth, startNextMonth, endMonth];
    return date;
  } else if (input != "Invalid date" && output != "Invalid date") {
    var inputNext = checkDate(output, "today");
    date = [input, inputNext, output];
    return date;
  } 
}

const getOrderOfWeek = async (req, res) => {
  try {
    const date = new Date();
    const startOfWeek = moment(date).startOf('isoweek');
    const endOfWeek = moment(date).endOf('isoweek');
    const startOfNextWeek = moment(date)
      .startOf("isoweek")
      .add(1, "week")
      .format("YYYY-MM-DD");

    const daysOfWeek = [];
    let currentDay = startOfWeek.clone();

    while (currentDay.isSameOrBefore(endOfWeek, 'day')) {
      daysOfWeek.push(currentDay.format('YYYY-MM-DD'));
      currentDay.add(1, 'day');
    }


    var order = await Order.find({ 
      created: { $gte: startOfWeek, $lte: startOfNextWeek }, 
      order_status: { $ne: 'canceled' }
    });

    const plainOrder = order.map((order) => ({
      ...order.toJSON(),
      created: moment(order.created).format("YYYY-MM-DD"),
    }));

    const result = []
    daysOfWeek.forEach(element => {
      var countOrder = 0
      plainOrder.forEach(order => {
        if (element === order.created) {
          countOrder += 1
        }
      });

      result.push({
        _id: moment(element).format("DD-MM-YYYY"),
        countOrder: countOrder
      })
    });
    res.json(result);
  } catch (error) {
    console.error("Error fetching revenue:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching revenue." });
  }
};

const getAmountOfWeek = async (req, res) => {
  try {
    const date = new Date();
    const startOfWeek = moment(date).startOf('isoweek');
    const endOfWeek = moment(date).endOf('isoweek');
    const startOfNextWeek = moment(date)
      .startOf("isoweek")
      .add(1, "week")
      .format("YYYY-MM-DD");

    const daysOfWeek = [];
    let currentDay = startOfWeek.clone();

    while (currentDay.isSameOrBefore(endOfWeek, 'day')) {
      daysOfWeek.push(currentDay.format('YYYY-MM-DD'));
      currentDay.add(1, 'day');
    }

    var order = await Order.find({ created: { $gte: startOfWeek, $lte: startOfNextWeek }, order_status: 'completed' });

    const plainOrder = order.map((order) => ({
      ...order.toJSON(),
      created: moment(order.created).format("YYYY-MM-DD"),
    }));

    const result = []
    daysOfWeek.forEach(element => {
      var total_amount = 0
      plainOrder.forEach(order => {
        if (element === order.created) {
          total_amount += order.total_amount
        }
      });

      result.push({
        _id: moment(element).format("DD-MM-YYYY"),
        total_amount: total_amount
      })
    });
    res.json(result);
  } catch (error) {
    console.error("Error fetching revenue:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching revenue." });
  }
};


module.exports = {
  getReport,
  reportDetail,
  getOrderOfWeek,
  getAmountOfWeek
};
