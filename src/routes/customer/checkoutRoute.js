const express = require("express");
const router = express.Router();

const {
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
  createOrderGHN
} = require("../../controllers/customer_page/checkoutController");

router.get("/", getPage);
router.post("/shipping-info", createShippingInfo);

router.post("/payment-momo", paymentWithMomo);
router.post("/ipn", ipn);
router.get("/momo_return", getMoMoReturn);

router.post("/payment-vnpay", paymentWithVNPAY);
router.get("/vnpay_ipn", ipnVNPAY);
router.get("/vnpay_return", returnUrl);

router.post("/cod", codPay);
router.get("/cod_return", getCodReturn);

router.get("/download-invoice", downloadInvoice);
router.post("/create-order-ghn", createOrderGHN);
module.exports = router;
