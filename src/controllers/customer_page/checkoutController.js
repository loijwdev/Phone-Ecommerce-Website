const Cart = require("../../models/cart");
const Product = require("../../models/product");
const Customer = require("../../models/customer");
const Order = require("../../models/order");
const uuid = require("uuid");
const moment = require("moment");
const nodemailer = require("nodemailer");
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const VNnum2words = require("vn-num2words");
const axios = require("axios");
const c = require("config");
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

let name, id, email;
const getPage = async (req, res) => {
  if (req.session.customer) {
    name = req.session.customer.name;
    id = req.session.customer._id;
    email = req.session.customer.email;
  } else {
    return res.redirect("/cus/auth");
  }
  const cart = await Cart.findOne({
    customerId: req.session.customer._id,
  }).exec();
  if (!cart) {
    return res.render("customer/checkout", {
      items: [],
      totalAmount: formatCurrency(0),
    });
  }
  const formattedCarts = {
    items: await Promise.all(
      cart.items.map(async (item) => {
        const { productName, image, brand, id } = await getProductInfo(
          item.productId
        );
        // Tính giá trị của mỗi mặt hàng
        const totalPrice = item.price * item.quantity;
        return {
          ...item,
          productName: productName,
          id: id,
          unitPrice: formatCurrency(item.price),
          price: formatCurrency(totalPrice),
          quantity: item.quantity,
          capacity: item.capacity,
          color: item.color,
        };
      })
    ),
  };

  // Tính tổng giá trị của tất cả các mặt hàng trong giỏ hàng
  const totalAmount = cart.items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const customer = await Customer.findById(req.session.customer._id).exec();
  const shippingInfo = customer.shippingInfo;

  res.render("customer/checkout", {
    carts: formattedCarts.items,
    name,
    totalAmount: formatCurrency(totalAmount),
    shippingInfo,
  });
};

const formatCurrency = (amount) => {
  const formattedAmount = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
  return formattedAmount;
};

const formatDate = (date) => {
  return new Date(date).toLocaleString("vi-VN");
};

const createShippingInfo = async (req, res) => {
  const { fullname, phone, address } = req.body;
  const customer = await Customer.findById(req.session.customer._id).exec();
  if (customer) {
    customer.shippingInfo.push({
      fullname,
      phone,
      address,
    });
    await customer.save();
  }
  res.json({ success: true });
};

let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.USER,
    pass: process.env.PASS,
  },
});

const createMailOptions = (toEmail, filePath, order) => {
  return {
    from: "nguyenquangloi2666@gmail.com",
    to: toEmail,
    subject: "Đơn hàng của bạn đã được xác nhận",
    html: `
    <h1>Kính chào quý khách</h1>
    <p>TDTU Mobile gửi đến quý khách hóa đơn điện tử cho đơn hàng ${order._id} của quý khách.</p>
    <p>Quý khách vui lòng kiểm tra hóa đơn VAT bằng cách tải file đính kèm và mở file trực tiếp từ thư mục đã tải về trong máy tính.</p>
    <h2 style ="font-weith: bold">Lưu ý :</h2>
    <ul>
        <li>Toàn bộ hàng hóa và dịch vụ được bán ra bởi TDTU MOBILE được phát hành hóa đơn VAT ngay tại thời điểm xuất bill bán hàng cho quý khách hàng.</li>
        <li>Quý khách hàng vui lòng kiểm tra thông tin hóa đơn, mọi sai sót trên hóa đơn sẽ được TDTU MOBILE hỗ trợ thay đổi thông tin cho Quý Khách Hàng TRONG CÙNG NGÀY.</li>
    </ul>
    <h2 style ="font-weith: bold">Thông tin đơn hàng:</h2>
    <table>
                <tr>
                    <td>Thông tin thanh toán</td>
                    <td style="padding-left: 40px;">Địa chi giao hàng</td>
                    <td style="padding-left: 40px;">Mã đơn hàng</td>
                </tr>
                <tr>
                    <td> ${toEmail}</td>
                    <td style="padding-left: 40px;">${order.receiver_info}</td>
                    <td style="padding-left: 40px;">${order._id}</td>
                </tr>
            </table>
    <h2 style ="font-weith: bold">Hóa đơn đơn hàng được đính ở tệp đính kèm</h2>
    <p>Trân trọng cảm ơn quý khách đã tin tưởng và ủng hộ TDTU MOBILE</p>
    `,
    attachments: [
      {
        filename: `invoice_${order._id}.pdf`,
        path: filePath,
        contentType: "application/pdf",
      },
    ],
  };
};

let shippingInfo = null;
let products = {};
let receiverInfo = null;
let orderId = null;

const ipn = async (req, res) => {
  try {
    const code = req.body.resultCode;
    const message = req.body.message;
    const amount = req.body.amount;
    const transId = req.body.transId;
    let productsArray = [];
    let allProducts = [];
    if (code == 0 && message == "Successful.") {
      for (const product of products) {
        const productToUpdate = await Product.findOne({
          _id: product.product_id,
          "capacities.capacity": product.capacity,
          "capacities.colors.color": product.color,
        });

        if (!productToUpdate) {
          throw new Error("Product not found");
        }

        const capacityToUpdate = productToUpdate.capacities.find(
          (capacity) => capacity.capacity === product.capacity
        );
        const colorToUpdate = capacityToUpdate.colors.find(
          (color) => color.color === product.color
        );

        if (
          !colorToUpdate ||
          !colorToUpdate.serialNumbers ||
          colorToUpdate.serialNumbers.length < product.quantity // Check if enough serial numbers are available
        ) {
          throw new Error("Not enough serial numbers available");
        }

        let productMap = {};

        for (let i = 0; i < product.quantity; i++) {
          const randomIndex = Math.floor(
            Math.random() * colorToUpdate.serialNumbers.length
          );

          // Create a key based on the product's attributes
          const productKey = `${product.capacity}-${product.color}`;

          // If this product isn't in the map yet, add it
          if (!productMap[productKey]) {
            productMap[productKey] = {
              capacity: product.capacity,
              color: product.color,
              serialNumbers: [],
            };
          }

          // Add the serial number to this product's array of serial numbers
          productMap[productKey].serialNumbers.push(
            colorToUpdate.serialNumbers[randomIndex]
          );

          colorToUpdate.serialNumbers.splice(randomIndex, 1);
        }

        productsArray = Object.values(productMap);
        allProducts.push(...productsArray);

        // Decrease the quantity in stock
        colorToUpdate.quantityInStock -= product.quantity;
        // Save the product
        await productToUpdate.save();
      }
      const productsWithSerialNumbers = products.map((product, index) => ({
        ...product,
        product_name:
          product.product_name +
          " (" +
          allProducts[index].serialNumbers.join(", ") +
          ")",
      }));

      const order = new Order({
        customer_id: id,
        customer_name: name,
        products: productsWithSerialNumbers,
        total_amount: amount * 100,
        payment_method: "momo",
        receiver_info: receiverInfo,
        order_type: "web",
        order_status: "processing",
        transIdPay: transId,
      });
      await order.save();
      orderId = order._id;
      for (const product of products) {
        await Product.findByIdAndUpdate(product.product_id, {
          $inc: { quantityInStock: -product.quantity },
        });
      }

      await clearCart(id);
      await createOrderGHN(req, res, order, 0);
      await downloadInvoice(req, res, order, email);
    } else {
      console.error(`Error processing IPN: ${message}`);
    }
  } catch (error) {
    console.error(`Error processing IPN: ${error}`);
    res.status(500).send("Error processing IPN");
  }
};

const getMoMoReturn = async (req, res) => {
  const order = await Order.findById(orderId);
  res.render("customer/success", {
    order,
    msg: "ĐÃ HOÀN THÀNH",
    receiverInfo: receiverInfo,
    name,
  });
};

const paymentWithMomo = async (req, res) => {
  //https://developers.momo.vn/#/docs/en/aiov2/?id=payment-method
  //parameters
  var partnerCode = "MOMO";
  var accessKey = "F8BBA842ECF85";
  var secretkey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
  var requestId = partnerCode + uuid.v4();
  var orderId = requestId;
  var orderInfo = "Pay with MoMo";
  // var redirectUrl = "https://momo.vn/return";
  var redirectUrl = process.env.url_domain + "/checkout/momo_return";

  var ipnUrl = process.env.url_domain + "/checkout/ipn";
  // var ipnUrl = redirectUrl = "https://webhook.site/454e7b77-f177-4ece-8236-ddf1c26ba7f8";
  var amount = req.body.amount;
  var requestType = "captureWallet";
  var extraData = ""; //pass empty value if your merchant does not have stores

  shippingInfo = req.body.deliveryInfo;
  products = req.body.products;
  receiverInfo = req.body.receiverInfo;
  //before sign HMAC SHA256 with format
  //accessKey=$accessKey&amount=$amount&extraData=$extraData&ipnUrl=$ipnUrl&orderId=$orderId&orderInfo=$orderInfo&partnerCode=$partnerCode&redirectUrl=$redirectUrl&requestId=$requestId&requestType=$requestType
  var rawSignature =
    "accessKey=" +
    accessKey +
    "&amount=" +
    amount +
    "&extraData=" +
    extraData +
    "&ipnUrl=" +
    ipnUrl +
    "&orderId=" +
    orderId +
    "&orderInfo=" +
    orderInfo +
    "&partnerCode=" +
    partnerCode +
    "&redirectUrl=" +
    redirectUrl +
    "&requestId=" +
    requestId +
    "&requestType=" +
    requestType;
  //puts raw signature
  console.log("--------------------RAW SIGNATURE----------------");
  console.log(rawSignature);
  //signature
  const crypto = require("crypto");
  var signature = crypto
    .createHmac("sha256", secretkey)
    .update(rawSignature)
    .digest("hex");
  console.log("--------------------SIGNATURE----------------");
  console.log(signature);

  //json object send to MoMo endpoint
  const requestBody = JSON.stringify({
    partnerCode: partnerCode,
    accessKey: accessKey,
    requestId: requestId,
    amount: amount,
    orderId: orderId,
    orderInfo: orderInfo,
    redirectUrl: redirectUrl,
    ipnUrl: ipnUrl,
    extraData: extraData,
    requestType: requestType,
    signature: signature,
    lang: "en",
  });
  //Create the HTTPS objects
  const https = require("https");
  const options = {
    hostname: "test-payment.momo.vn",
    port: 443,
    path: "/v2/gateway/api/create",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(requestBody),
    },
  };
  //Send the request and get the response
  const httpsReq = https.request(options, (httpsRes) => {
    console.log(`Status: ${httpsRes.statusCode}`);
    console.log(`Headers: ${JSON.stringify(httpsRes.headers)}`);
    httpsRes.setEncoding("utf8");
    httpsRes.on("data", (body) => {
      console.log("Body: ");
      console.log(body);
      console.log("payUrl: ");
      const payUrl = JSON.parse(body).payUrl;
      console.log(payUrl);
      res.json({ payUrl: payUrl });
    });
    httpsRes.on("end", () => {
      console.log("No more data in response.");
    });
  });

  httpsReq.on("error", (e) => {
    console.log(`problem with request: ${e.message}`);
  });
  // write data to request body
  console.log("Sending....");
  httpsReq.write(requestBody);
  httpsReq.end();
};

const paymentWithVNPAY = async (req, res, next) => {
  process.env.TZ = "Asia/Ho_Chi_Minh";

  let date = new Date();
  let createDate = moment(date).format("YYYYMMDDHHmmss");

  let ipAddr =
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress;

  let tmnCode = process.env.vnp_TmnCode;
  let secretKey = process.env.vnp_HashSecret;
  let vnpUrl = process.env.vnp_Url;
  let returnUrl = process.env.url_domain + process.env.vnp_ReturnUrl;

  let orderId = "VNPAY" + uuid.v4();
  let amount = req.body.amount;
  let bankCode = req.body.bankCode;

  shippingInfo = req.body.deliveryInfo;
  products = req.body.products;
  receiverInfo = req.body.receiverInfo;

  let locale = req.body.language;
  if (locale === null || locale === "") {
    locale = "vn";
  }
  let currCode = "VND";
  let vnp_Params = {};
  vnp_Params["vnp_Version"] = "2.1.0";
  vnp_Params["vnp_Command"] = "pay";
  vnp_Params["vnp_TmnCode"] = tmnCode;
  vnp_Params["vnp_Locale"] = locale;
  vnp_Params["vnp_CurrCode"] = currCode;
  vnp_Params["vnp_TxnRef"] = orderId;
  vnp_Params["vnp_OrderInfo"] = "Thanh toan cho ma GD:" + orderId;
  vnp_Params["vnp_OrderType"] = "other";
  vnp_Params["vnp_Amount"] = amount * 100;
  vnp_Params["vnp_ReturnUrl"] = returnUrl;
  vnp_Params["vnp_IpAddr"] = ipAddr;
  vnp_Params["vnp_CreateDate"] = createDate;
  if (bankCode !== null && bankCode !== "") {
    vnp_Params["vnp_BankCode"] = bankCode;
  }

  vnp_Params = sortObject(vnp_Params);

  let querystring = require("qs");
  let signData = querystring.stringify(vnp_Params, { encode: false });
  let crypto = require("crypto");
  let hmac = crypto.createHmac("sha512", secretKey);
  let signed = hmac.update(new Buffer(signData, "utf-8")).digest("hex");
  vnp_Params["vnp_SecureHash"] = signed;
  vnpUrl += "?" + querystring.stringify(vnp_Params, { encode: false });
  res.json({ vnpUrl: vnpUrl });
};

const returnUrl = async (req, res, next) => {
  let vnp_Params = req.query;

  let secureHash = vnp_Params["vnp_SecureHash"];

  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  vnp_Params = sortObject(vnp_Params);

  let tmnCode = process.env.vnp_TmnCode;
  let secretKey = process.env.vnp_HashSecret;

  let querystring = require("qs");
  let signData = querystring.stringify(vnp_Params, { encode: false });
  let crypto = require("crypto");
  let hmac = crypto.createHmac("sha512", secretKey);
  let signed = hmac.update(new Buffer(signData, "utf-8")).digest("hex");
  let transId = req.query.vnp_TransactionNo
  console.log(req.query);
  if (secureHash === signed) {
    //Kiem tra xem du lieu trong db co hop le hay khong va thong bao ket qua
    if (req.session.orderCreated) {
      return res.redirect("/check-order");
    }

    const amount = req.query.vnp_Amount / 100;
    let productsArray = [];
    let allProducts = [];

    for (const product of products) {
      const productToUpdate = await Product.findOne({
        _id: product.product_id,
        "capacities.capacity": product.capacity,
        "capacities.colors.color": product.color,
      });

      if (!productToUpdate) {
        throw new Error("Product not found");
      }

      const capacityToUpdate = productToUpdate.capacities.find(
        (capacity) => capacity.capacity === product.capacity
      );
      const colorToUpdate = capacityToUpdate.colors.find(
        (color) => color.color === product.color
      );

      if (
        !colorToUpdate ||
        !colorToUpdate.serialNumbers ||
        colorToUpdate.serialNumbers.length < product.quantity // Check if enough serial numbers are available
      ) {
        throw new Error("Not enough serial numbers available");
      }

      let productMap = {};

      for (let i = 0; i < product.quantity; i++) {
        const randomIndex = Math.floor(
          Math.random() * colorToUpdate.serialNumbers.length
        );

        // Create a key based on the product's attributes
        const productKey = `${product.capacity}-${product.color}`;

        // If this product isn't in the map yet, add it
        if (!productMap[productKey]) {
          productMap[productKey] = {
            capacity: product.capacity,
            color: product.color,
            serialNumbers: [],
          };
        }

        // Add the serial number to this product's array of serial numbers
        productMap[productKey].serialNumbers.push(
          colorToUpdate.serialNumbers[randomIndex]
        );

        colorToUpdate.serialNumbers.splice(randomIndex, 1);
      }

      productsArray = Object.values(productMap);
      allProducts.push(...productsArray);

      // Decrease the quantity in stock
      colorToUpdate.quantityInStock -= product.quantity;
      // Save the product
      await productToUpdate.save();
    }
    const productsWithSerialNumbers = products.map((product, index) => ({
      ...product,
      product_name:
        product.product_name +
        " (" +
        allProducts[index].serialNumbers.join(", ") +
        ")",
    }));

    const order = new Order({
      customer_id: id,
      customer_name: name,
      products: productsWithSerialNumbers,
      total_amount: amount,
      payment_method: "vnpay",
      receiver_info: receiverInfo,
      order_type: "web",
      order_status: "processing",
      transIdPay: transId,
      vnp_TxnRef: req.query.vnp_TxnRef,
      vnp_date: req.query.vnp_PayDate,
    });
    await order.save();
    req.session.orderCreated = true;

    await clearCart(id);
    orderId = order._id;

    await downloadInvoice(req, res, order, email);
    await createOrderGHN(req, res, order, 0);
    res.render("customer/success", {
      code: vnp_Params["vnp_ResponseCode"],
      order,
      msg: "ĐÃ HOÀN THÀNH",
      receiverInfo: receiverInfo,
      name,
    });
  } else {
    res.render("customer/success", { code: "97", msg: "ĐÃ THẤT BẠI" });
  }
};

const ipnVNPAY = async (req, res, next) => {
  let vnp_Params = req.query;
  let secureHash = vnp_Params["vnp_SecureHash"];

  let orderId = vnp_Params["vnp_TxnRef"];
  let rspCode = vnp_Params["vnp_ResponseCode"];

  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  vnp_Params = sortObject(vnp_Params);
  let secretKey = process.env.vnp_HashSecret;
  let querystring = require("qs");
  let signData = querystring.stringify(vnp_Params, { encode: false });
  let crypto = require("crypto");
  let hmac = crypto.createHmac("sha512", secretKey);
  let signed = hmac.update(new Buffer(signData, "utf-8")).digest("hex");

  let paymentStatus = "0"; // Giả sử '0' là trạng thái khởi tạo giao dịch, chưa có IPN. Trạng thái này được lưu khi yêu cầu thanh toán chuyển hướng sang Cổng thanh toán VNPAY tại đầu khởi tạo đơn hàng.
  //let paymentStatus = '1'; // Giả sử '1' là trạng thái thành công bạn cập nhật sau IPN được gọi và trả kết quả về nó
  //let paymentStatus = '2'; // Giả sử '2' là trạng thái thất bại bạn cập nhật sau IPN được gọi và trả kết quả về nó

  let checkOrderId = true; // Mã đơn hàng "giá trị của vnp_TxnRef" VNPAY phản hồi tồn tại trong CSDL của bạn
  let checkAmount = true; // Kiểm tra số tiền "giá trị của vnp_Amout/100" trùng khớp với số tiền của đơn hàng trong CSDL của bạn
  console.log(rspCode);
  if (secureHash === signed) {
    //kiểm tra checksum
    if (checkOrderId) {
      if (checkAmount) {
        if (paymentStatus == "0") {
          //kiểm tra tình trạng giao dịch trước khi cập nhật tình trạng thanh toán
          if (rspCode == "00") {
            //thanh cong
            //paymentStatus = '1'
            // Ở đây cập nhật trạng thái giao dịch thanh toán thành công vào CSDL của bạn
            res.status(200).json({ RspCode: "00", Message: "Success" });
          } else {
            //that bai
            //paymentStatus = '2'
            // Ở đây cập nhật trạng thái giao dịch thanh toán thất bại vào CSDL của bạn
            res.status(200).json({ RspCode: "00", Message: "Success" });
          }
        } else {
          res.status(200).json({
            RspCode: "02",
            Message: "This order has been updated to the payment status",
          });
        }
      } else {
        res.status(200).json({ RspCode: "04", Message: "Amount invalid" });
      }
    } else {
      res.status(200).json({ RspCode: "01", Message: "Order not found" });
    }
  } else {
    res.status(200).json({ RspCode: "97", Message: "Checksum failed" });
  }
};

function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}

const codPay = async (req, res) => {
  const receiverInfo = req.body.receiverInfo;
  const id = req.session.customer._id; // Assuming id is part of the request body
  const name = req.session.customer.name; // Assuming name is part of the request body
  let productsArray = [];
  let allProducts = [];

  for (const product of req.body.products) {
    const productToUpdate = await Product.findOne({
      _id: product.product_id,
      "capacities.capacity": product.capacity,
      "capacities.colors.color": product.color,
    });

    if (!productToUpdate) {
      throw new Error("Product not found");
    }

    const capacityToUpdate = productToUpdate.capacities.find(
      (capacity) => capacity.capacity === product.capacity
    );
    const colorToUpdate = capacityToUpdate.colors.find(
      (color) => color.color === product.color
    );

    if (
      !colorToUpdate ||
      !colorToUpdate.serialNumbers ||
      colorToUpdate.serialNumbers.length < product.quantity // Check if enough serial numbers are available
    ) {
      throw new Error("Not enough serial numbers available");
    }

    let productMap = {};

    for (let i = 0; i < product.quantity; i++) {
      const randomIndex = Math.floor(
        Math.random() * colorToUpdate.serialNumbers.length
      );

      // Create a key based on the product's attributes
      const productKey = `${product.capacity}-${product.color}`;

      // If this product isn't in the map yet, add it
      if (!productMap[productKey]) {
        productMap[productKey] = {
          capacity: product.capacity,
          color: product.color,
          serialNumbers: [],
        };
      }

      // Add the serial number to this product's array of serial numbers
      productMap[productKey].serialNumbers.push(
        colorToUpdate.serialNumbers[randomIndex]
      );

      colorToUpdate.serialNumbers.splice(randomIndex, 1);
    }

    productsArray = Object.values(productMap);
    allProducts.push(...productsArray);

    // Decrease the quantity in stock
    colorToUpdate.quantityInStock -= product.quantity;
    // Save the product
    await productToUpdate.save();
  }
  const productsWithSerialNumbers = req.body.products.map((product, index) => ({
    ...product,
    product_name:
      product.product_name +
      " (" +
      allProducts[index].serialNumbers.join(", ") +
      ")",
  }));

  const order = new Order({
    customer_id: id,
    customer_name: name,
    products: productsWithSerialNumbers,
    total_amount: req.body.amount,
    payment_method: "cod",
    receiver_info: req.body.receiverInfo,
    order_type: "web",
    order_status: "processing",
  });
  await order.save();

  await clearCart(id);
  // Store orderId, receiverInfo, and name in the session
  orderId = order._id;
  req.session.orderId = order._id;
  req.session.receiverInfo = receiverInfo;
  req.session.allProducts = allProducts;
  console.log(allProducts);
  await downloadInvoice(req, res, order, email);
  createOrderGHN(req, res, order, order.total_amount);
  res.json({ success: true });
};

const getCodReturn = async (req, res) => {
  // Retrieve orderId, receiverInfo, and name from the session
  const orderId = req.session.orderId;
  const receiverInfo = req.session.receiverInfo;
  const name = req.session.customer.name;
  const allProducts = req.session.allProducts;
  console.log(allProducts);
  const order = await Order.findById(orderId);
  res.render("customer/success", {
    order,
    msg: "ĐÃ HOÀN THÀNH",
    receiverInfo: receiverInfo,
    name,
    allProducts,
  });
};

const clearCart = async (customerId) => {
  try {
    const cart = await Cart.findOne({ customerId });
    if (cart) {
      await Cart.deleteOne({ customerId });
      console.log(`Cart cleared for customer with ID ${customerId}`);
    } else {
      console.log(`Cart not found for customer with ID ${customerId}`);
    }
  } catch (error) {
    console.error(`Error clearing cart: ${error}`);
  }
};

//write a function create vat invoice pdf

const generatePDF = async (htmlContent, orderId) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(htmlContent, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "1cm",
      right: "1cm",
      bottom: "1cm",
      left: "1cm",
    },
  });

  const filePath = path.join("./src/public/order", `invoice_${orderId}.pdf`);
  fs.writeFileSync(filePath, pdfBuffer);

  await browser.close();
  return filePath;
};

function generateNumber() {
  return Math.floor(Math.random() * 9000000) + 1000000;
}

const downloadInvoice = async (req, res, order, email) => {
  try {
    const date = new Date(order.created);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const htmlContent = `
    <table style="border: 2px solid black; border-collapse: collapse;">
            <tr style="border:2px solid black ; border-collapse: collapse;">
                <td colspan="2"> <img src="http://localhost:3031/img/logo3.ico" alt="" style="width: 200px; height: 200px;"> </td>
                <td colspan="3">
                    <h1 style="text-align: center;"> Hóa đơn giá trị gia tăng </h1>
                    <h3 style="text-align: center;"> VAT INVOICE </h3>
                    <p style="text-align: center;">Ngày(Date) ${day} tháng(month) ${month} năm(year) ${year}</p>
                    <p style="text-align: center;">Mã của CQT: 0X0FXXXX57XXFF4E9XXE99C3XX96EXX2X</p>
                </td>
                <td colspan="4">
                    <p style="text-align: center;"> Ký hiệu (Serial): AA/21E </p>
                    <p style="text-align: center;"> Số(No.):
                    <h2 style="color: red; font-weight: bold; text-align: center;">${generateNumber()}</h2>
                    </p>
                </td>
            </tr>
            <tr style="border:2px solid black ; border-collapse: collapse;">
                <td colspan="3">
                    <p >Đơn vị bán hàng (Seller): </p>
                    <p>Mã số thuế (VAT code): </p>
                    <p>Địa chỉ (Address): </p>
                    <p>Điện thoại (Tel): </p>
                    <p>Số tài khoản (A/C No.): </p>
                </td>
                <td colspan="3">
                    <p>CÔNG TY TNHH TDTU MOBILE</p>
                    <p style="font-weight: bold;">0312112772</p>
                    <p>Số 19, đường Nguyễn Hữu Thọ, phường Tân Phong, Quận 7, TP. Hồ Chí Minh</p>
                    <p>(028) 37 755 035</p>
                    <p>......................</p>
                </td>
            </tr>
            <tr style="border:2px solid black ; border-collapse: collapse;" >
                <td style="width: 100px;" colspan="3">
                    <p>Họ tên người mua hàng (Buyer): </p>
                    <p>Tên đơn vị (Company's name): </p>
                    <p>Mã số thuế (Tax code): </p>
                    <p>Hình thức thanh toán (Payment metdod): </p>
                    <p>Địa chỉ (Address): </p>
                </td>
                <td  colspan="3">
                    <h4>${order.customer_name}</h4>
                    <p>......................</p>
                    <p>......................</p>
                    <p>${order.payment_method}</p>
                    <p>${order.receiver_info}</p>
                </td>
            </tr>
            <tr style="border:2px solid black ; border-collapse: collapse;">
                <td style="border:2px solid black ; border-collapse: collapse; width: 5px;" >STT (No.)</td>
                <td style="border:2px solid black ; border-collapse: collapse;">Tên hàng hóa, dịch vụ (Description)</td>
                <td style="border:2px solid black ; border-collapse: collapse;">Đơn vị tính(Unit)</td>
                <td style="border:2px solid black ; border-collapse: collapse;">Số lượng(Quantity)</td>
                <td style="border:2px solid black ; border-collapse: collapse;">Đơn giá(Unit price)</td>
                <td style="border:2px solid black ; border-collapse: collapse;">Thành tiền(Chưa thuế GTGT)(Amount not VAT)</td>
                <td style="border:2px solid black ; border-collapse: collapse;">TS GTGT(VAT rate)</td>
                <td style="border:2px solid black ; border-collapse: collapse;">Tiền thuế (VAT)</td>
                <td style="border:2px solid black ; border-collapse: collapse;">Thành tiền(Gồm thuế GTGT)(Amount)</td>
            </tr>

            ${order.products
              .map((product, index) => {
                return `
                <tr>
                  <td style="border:2px solid black ; border-collapse: collapse;">${
                    index + 1
                  }</td>
                  <td style="border:2px solid black ; border-collapse: collapse;">${
                    product.product_name
                  }</td>
                  <td style="border:2px solid black ; border-collapse: collapse;">Cái</td>
                  <td style="border:2px solid black ; border-collapse: collapse;">${
                    product.quantity
                  }</td>
                  <td style="border:2px solid black ; border-collapse: collapse;">${formatCurrency(
                    product.unit_price * 0.92
                  )}</td>
                  <td style="border:2px solid black ; border-collapse: collapse;">${formatCurrency(
                    product.total_price * 0.92
                  )}</td>
                  <td style="border:2px solid black ; border-collapse: collapse;">8%</td>
                  <td style="border:2px solid black ; border-collapse: collapse;">${formatCurrency(
                    product.total_price * 0.08
                  )}</td>
                  <td style="border:2px solid black ; border-collapse: collapse;">${formatCurrency(
                    product.total_price
                  )}</td>
                </tr>
              `;
              })
              .join("")}
            <tr>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;">.</td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
            </tr>
            <tr>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;">.</td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
            </tr>
            <tr>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;">.</td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
            </tr>
            <tr>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;">.</td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
            </tr>
            <tr>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;">.</td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
                <td style="border:2px solid black ; border-collapse: collapse;"></td>
            </tr>
            <tr>
                
                <td style="border:2px solid black ; border-collapse: collapse;" colspan="5">Cộng tiền hàng (Total amount:)</td>
                  <td style="border:2px solid black ; border-collapse: collapse;" >${formatCurrency(
                    order.products.reduce(
                      (total, product) => total + product.total_price * 0.92,
                      0
                    )
                  )}</td>
                  <td style="border:2px solid black ; border-collapse: collapse;" ></td>
                  <td style="border:2px solid black ; border-collapse: collapse;" >${formatCurrency(
                    order.products.reduce(
                      (total, product) => total + product.total_price * 0.08,
                      0
                    )
                  )}</td>
                  <td style="border:2px solid black ; border-collapse: collapse;" >${formatCurrency(
                    order.products.reduce(
                      (total, product) => total + product.total_price,
                      0
                    )
                  )}</td>

            </tr>
            
            <tr>
                <td style="border:2px solid black ; border-collapse: collapse;" colspan="3">Số tiền viết bằng chữ (Amount in words): </td>
                <td style="border:2px solid black ; border-collapse: collapse;" colspan="6" style="padding-left:13px">${VNnum2words(
                  order.products.reduce(
                    (total, product) => total + product.total_price,
                    0
                  )
                )}</td>
            </tr>
            <tr>
                <td colspan="4" style="padding: 20px; text-align: center;">Người mua hàng (Buyer) </td>
                <td colspan="4" style="padding: 20px; text-align: center;">Người bán hàng (Seller)</td>
            </tr>
            <tr>
                <td colspan="4" style=" text-align: center;">Ký ghi rõ họ tên <br>(Sign & full name) </td>
                <td colspan="4" style=" text-align: center;">Ký, đóng dấu, ghi rõ họ tên <br>(Sign, stamp & full name) </td>
            </tr>
            <tr>
                <td colspan="4"></td>
                <td colspan="4" style="text-align: center; border: 2px solid red; color: red; padding-right: 55px; border-collapse: separate; width: 2%;">
                    <br>
                    Signature Valid 
                    <img src="http://localhost:3031/img/check.jpg" alt="Dấu tích" style="vertical-align: middle; margin-right: 5px; width: 10%;"> 
                    <br> Ký bởi: TDTU MOBILE
                    <br> Ký ngày: ${day}/${month}/${year}
                </td>
            </tr>
            <tr>
                <td>.</td>
                <td></td>
            </tr>
        </table>
      
    `;
    // Generate and download the PDF
    const filePath = await generatePDF(htmlContent, order._id);
    const mailOptions = createMailOptions(email, filePath, order);
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching order data" });
  }
};

const createOrderGHN = async (req, res, order, codAmount) => {
  try {
    const url =
      "https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/create";
    const headers = {
      "Content-Type": "application/json",
      Token: "7b6f17c8-eea8-11ee-8bfa-8a2dda8ec551",
      ShopId: 191637,
    };
    const urlProvince =
      "https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/province";
    const responseProvince = await axios.get(urlProvince, { headers });
    const province = responseProvince.data.data.find((item) =>
      order.receiver_info.split(", ")[5].includes(item.ProvinceName)
    );
    const urlDistrict =
      "https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/district";
    const dataDistrict = { province_id: province.ProvinceID };
    const responseDistrict = await axios.post(urlDistrict, dataDistrict, {
      headers,
    });
    const district = responseDistrict.data.data.find((item) =>
      order.receiver_info.split(", ")[4].includes(item.DistrictName)
    );
    const urlWard =
      "https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/ward?district_id";
    const dataWard = { district_id: district.DistrictID };
    const responseWard = await axios.post(urlWard, dataWard, { headers });
    var ward = order.receiver_info.split(", ")[3].trim();
    console.log(ward);
    if (ward.startsWith("Phường")) {
      var number = ward.replace(/\D/g, "").slice(-3);
      number = parseInt(number, 10);
      console.log(number);
      ward = number
        ? "Phường " + number
        : "Phường " + ward.replace("Phường ", "").trim();
    }
    const foundWard = responseWard.data.data.find((item) =>
      item.WardName.includes(ward)
    );
    
    const infoArr = order.receiver_info.split(", ").map((item) => item.trim());
    const data = {
      payment_type_id: 1,
      note: "Gọi trước khi giao hàng",
      required_note: "KHONGCHOXEMHANG",
      from_name: "TDTU MOBILE",
      from_phone: "(028) 37 755 035",
      from_address: "Số 19, đường Nguyễn Hữu Thọ,",
      from_ward_name: "Phường Tân Phong",
      from_district_name: "Quận 7",
      from_province_name: "HCM",
      client_order_code: "",
      to_name: `${infoArr[0]}`,
      to_phone: `${infoArr[1]}`,
      to_address: `${infoArr[2]}`,
      to_ward_name: `${infoArr[3]}`,
      "to_district_name ": `${infoArr[4]}`,
      to_province_name: `${infoArr[5]}`,
      to_ward_code: `${foundWard.WardCode}`,
      to_district_id: `${district.DistrictID}`,
      cod_amount: codAmount,
      weight: 200,
      length: 1,
      width: 19,
      height: 10,
      content: "Sản phẩm điện tử",
      deliver_station_id: null,
      insurance_value: order.total_amount,
      service_id: 0,
      service_type_id: 2,
      coupon: null,
      pick_shift: [2],
      items: order.products.map((product) => ({
        name: product.product_name,
        code: product._id,
        quantity: product.quantity,
        price: product.unit_price,
        length: 15,
        width: 7,
        height: 2,
        weight: 2000,
      })),
    };
    const response = await axios.post(url, data, { headers });
    console.log(response.data.message_display);
    await Order.findByIdAndUpdate(
      order._id,
      { order_code_GHN: response.data.data.order_code },
      { new: true }
    );
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  getPage,
  createShippingInfo,
  paymentWithMomo,
  ipn,
  paymentWithVNPAY,
  ipnVNPAY,
  returnUrl,
  getMoMoReturn,
  codPay,
  getCodReturn,
  downloadInvoice,
  createOrderGHN,
};
