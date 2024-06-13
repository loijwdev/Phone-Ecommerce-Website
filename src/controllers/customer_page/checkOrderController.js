const Order = require("../../models/order");
const mongoose = require("mongoose");
const axios = require("axios");
const uuid = require("uuid");
const moment = require("moment");
const request = require("request");
const getPage = async (req, res) => {
  let name, order;
  if (req.session.customer) {
    name = req.session.customer.name;
    order = await Order.find({ customer_id: req.session.customer._id }).sort({
      created: -1,
    });
  }

  res.render("customer/check_order", { name, order });
};

const getOrder = async (req, res) => {
  const orderId = req.body.orderId;

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.send({ message: "Invalid order ID" });
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.send({ message: "Order not found" });
    }
    res.send(order);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

const cancelOrder = async (req, res) => {
  const orderId = req.body.orderId;
//   if (!req.session.customer) {
//     return res.send({ message: "Please log in to cancel order" });
//   }
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    return res.send({ message: "Invalid order ID" });
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.send({ message: "Order not found" });
    }
    if (order.order_status !== "processing") {
      return res.send({
        message: "Only orders in the Preprocessing status can be cancelled",
      });
    }
    if (order.payment_method === "momo") {
      await refundMoMo(order.transIdPay, order.total_amount / 100);
    } else if (order.payment_method === "vnpay") {
      await refundVnPay(
        order.transIdPay,
        order.total_amount,
        order.vnp_TxnRef,
        order.customer_name,
        order.vnp_date,
        req,
        res
      );
    }
    order.order_status = "canceled";
    await order.save();
    const headers = {
      "Content-Type": "application/json",
      Token: "7b6f17c8-eea8-11ee-8bfa-8a2dda8ec551",
      ShopId: 191637,
    };
    const data = {
      order_codes: [order.order_code_GHN],
    };
    const response = await axios.post(
      "https://dev-online-gateway.ghn.vn/shiip/public-api/v2/switch-status/cancel",
      data,
      { headers }
    );
    console.log(response.data);
    res.send({ message: "Order cancelled successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: error.message });
  }
};

const refundMoMo = async (transId, amount) => {
  var date = new Date().getTime();
  var requestId = date;
  var orderId = date + "0123";
  var partnerCode = "MOMO";
  var accessKey = "F8BBA842ECF85";
  var amount = amount;
  var lang = "vi";
  var description = "";
  var rawSignature =
    "accessKey=" +
    accessKey +
    "&amount=" +
    amount +
    "&description=" +
    description +
    "&orderId=" +
    orderId +
    "&partnerCode=" +
    partnerCode +
    "&requestId=" +
    requestId +
    "&transId=" +
    transId;
  var secretkey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
  const crypto = require("crypto");
  var signature = crypto
    .createHmac("sha256", secretkey)
    .update(rawSignature)
    .digest("hex");
  const requestBody = JSON.stringify({
    partnerCode: partnerCode,
    requestId: requestId,
    amount: amount,
    orderId: orderId,
    transId: transId,
    signature: signature,
    description: description,
    lang: lang,
  });
  const response = await axios.post(
    "https://test-payment.momo.vn/v2/gateway/api/refund",
    requestBody,
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  console.log(response.data);
};

const refundVnPay = async (
  transId,
  amount,
  TxnRef,
  custmer_name,
  vnp_date,
  req,
  res
) => {
  try {
    process.env.TZ = "Asia/Ho_Chi_Minh";
    let date = new Date();

    let vnp_TmnCode = process.env.vnp_TmnCode;
    let secretKey = process.env.vnp_HashSecret;
    let vnp_Api = process.env.vnp_Api;

    let vnp_TxnRef = TxnRef;
    let vnp_TransactionDate = vnp_date;
    let vnp_Amount = amount * 100;
    let vnp_TransactionType = "02";
    let vnp_CreateBy = custmer_name;

    let currCode = "VND";

    let vnp_RequestId = moment(date).format("HHmmss");
    let vnp_Version = "2.1.0";
    let vnp_Command = "refund";
    let vnp_OrderInfo = "Hoan tien GD ma:" + vnp_TxnRef;

    let vnp_IpAddr =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress;

    let vnp_CreateDate = moment(date).format("YYYYMMDDHHmmss");

    let vnp_TransactionNo = transId;

    let data =
      vnp_RequestId +
      "|" +
      vnp_Version +
      "|" +
      vnp_Command +
      "|" +
      vnp_TmnCode +
      "|" +
      vnp_TransactionType +
      "|" +
      vnp_TxnRef +
      "|" +
      vnp_Amount +
      "|" +
      vnp_TransactionNo +
      "|" +
      vnp_TransactionDate +
      "|" +
      vnp_CreateBy +
      "|" +
      vnp_CreateDate +
      "|" +
      vnp_IpAddr +
      "|" +
      vnp_OrderInfo;
    const crypto = require("crypto");
    let hmac = crypto.createHmac("sha512", secretKey);
    let vnp_SecureHash = hmac.update(new Buffer(data, "utf-8")).digest("hex");

    let dataObj = {
      vnp_RequestId: vnp_RequestId,
      vnp_Version: vnp_Version,
      vnp_Command: vnp_Command,
      vnp_TmnCode: vnp_TmnCode,
      vnp_TransactionType: vnp_TransactionType,
      vnp_TxnRef: vnp_TxnRef,
      vnp_Amount: vnp_Amount,
      vnp_TransactionNo: vnp_TransactionNo,
      vnp_CreateBy: vnp_CreateBy,
      vnp_OrderInfo: vnp_OrderInfo,
      vnp_TransactionDate: vnp_TransactionDate,
      vnp_CreateDate: vnp_CreateDate,
      vnp_IpAddr: vnp_IpAddr,
      vnp_SecureHash: vnp_SecureHash,
    };

    console.log(JSON.stringify(dataObj));
    request(
        {
          url: vnp_Api,
          method: "POST",
          json: true,
          body: dataObj,
        },
        function (error, response, body) {
          console.log(response);
          console.log(body);
          console.log(error);
        }
      );
    // const response = await axios.post("https://sandbox.vnpayment.vn/merchant_webapi/api/transaction", JSON.stringify(dataObj), {
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    // });

  } catch (error) {
    console.error(`Error in refundVnPay: ${error.message}`);
  }
};


module.exports = { getPage, getOrder, cancelOrder, refundMoMo, refundVnPay };
