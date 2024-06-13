// Require lib
require("dotenv").config();
const express = require("express");
const configViewEngine = require("./config/viewEngine");

// Require router

const homeRoute = require("./routes/homeRoute");
const loginRoute = require("./routes/loginRoute");
const singUpRoute = require("./routes/signUpRoute");
const productRoute = require("./routes/productRoute");
const customerRouter = require("./routes/customerRoute");
const posRouter = require("./routes/posRoute");
const changePWRoute = require("./routes/changePWRoute");
const orderRoute = require("./routes/orderRoute");
const reportRoute = require("./routes/reportRoute");
const staffRoute = require("./routes/staffRoute");
const profileRoute = require("./routes/profileRoute");
const logOutRoute = require("./routes/logOutRoute");
const requireLinkRoute = require("./routes/requireLinkRoute");
const isAuthenticated = require("./middleware/authMiddleware");
const ischangepw = require("./middleware/changepwMiddleware");
// Require config

const indexRoute = require("./routes/customer/indexRoute");
const shopRoute = require("./routes/customer/shopRoute");
const categoryRoute = require("./routes/categoryRoute");
const authRoute = require("./routes/customer/authRoute");
const cartRoute = require("./routes/customer/cartRoute");
const checkoutRoute = require("./routes/customer/checkoutRoute");
const productDetailRoute = require("./routes/customer/productDetailRoute");
const checkOrderRoute = require("./routes/customer/checkOrderRoute");
const favoriteRoute = require("./routes/customer/favoriteRoute");
const connectDb = require("./config/dbConnection");
connectDb();

const app = express(); // app exprexx
const port = process.env.PORT || 3000; // port

// config template engine
configViewEngine(app);

// Khai bao routee

app.use("/login", loginRoute);
app.use("/signup", singUpRoute);
app.use("/logout", isAuthenticated, logOutRoute);
app.use("/ChangePW", isAuthenticated, changePWRoute);
app.use("/product", isAuthenticated, ischangepw, productRoute);
app.use("/customer", isAuthenticated, ischangepw, customerRouter);
app.use("/pos", isAuthenticated, ischangepw, posRouter);
app.use("/report", isAuthenticated, ischangepw, reportRoute);
app.use("/order", isAuthenticated, ischangepw, orderRoute);
app.use("/staff", isAuthenticated, ischangepw, staffRoute);

// app.use("/", homeRoute);

app.use("/profile", isAuthenticated, ischangepw, profileRoute);
app.use("/requireLink", isAuthenticated, requireLinkRoute);
app.use("/category", isAuthenticated, categoryRoute);

app.use("/index", indexRoute);
app.use("/shop", shopRoute);
app.use("/cus", authRoute);
app.use("/cart", cartRoute);
app.use("/checkout", checkoutRoute);
app.use("/product-detail", productDetailRoute);
app.use("/check-order", checkOrderRoute);
app.use("/favorite", favoriteRoute);
app.use("/", isAuthenticated, ischangepw, homeRoute);
// Listen server
app.listen(port, () => console.log(`http://localhost:${port}`));
