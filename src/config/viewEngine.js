const path = require("path");
const express = require("express");
const Handlebars = require("handlebars");
const bodyParser = require("body-parser");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const i18n = require("i18n");
const cors = require("cors");
const handlebars = require("express-handlebars");
const {
  allowInsecurePrototypeAccess,
} = require("@handlebars/allow-prototype-access");

const configViewEngine = (app) => {
  // set view engine
  app.engine(
    "hbs",
    handlebars.engine({
      defaultLayout: "main",
      extname: ".hbs",
      handlebars: allowInsecurePrototypeAccess(Handlebars),
      helpers: {
        ifeq: function (a, b, options) {
          if (a == b) {
            return options.fn(this);
          }
          return options.inverse(this);
        },
        incrementedIndex: function (index) {
          return index + 1;
        },
        i18n: function () {
          return i18n.__.apply(this, arguments);
        },
        __n: function () {
          return i18n.__n.apply(this, arguments);
        },
        ifRoleIsAdmin: function (role, options) {
          if (role === "admin") {
            return options.fn(this);
          } else {
            return options.inverse(this);
          }
        },
        formatDate: function (date) {
          return new Date(date).toLocaleString("vi-VN");
        },
        formatCurrency: function (amount) {
          return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
          }).format(amount);
        },
        equal: function (a, b) {
          return a === b;
        },
        and: function (a, b) {
          return a && b;
        },
        ifor: function (v1, v2, v3, v4, options) {
          if (v1 == v2 || v1 == v3 || v1 == v4) {
            return options.fn(this);
          }
          return options.inverse(this);
        },
      },
    })
  );

  app.set("view engine", "hbs");
  app.set("views", path.join("./src", "resources/views"));
  // config static file
  app.use(express.static(path.join("./src", "public")));

  app.use(bodyParser.urlencoded({ extended: true })); //body parser
  app.use(bodyParser.json()); //bodyparser json
  app.use(cookieParser());
  app.use(express.urlencoded());
  app.use(express.json());
  app.use(cors());
  // app.use(express.static('/src/public/uploads'))
  app.use(
    session({
      secret: "loijwdev",
      resave: false,
      saveUninitialized: false,
    })
  );

  app.use((req, res, next) => {
    res.header("Cache-Control", "no-store");
    next();
  });

  app.use((req, res, next) => {
    res.locals.message = req.session.message;
    res.locals.orderMessage = req.session.orderMessage;
    res.locals.Posmessage = req.session.Posmessage;
    res.locals.SignUpMessage = req.session.SignUpMessage;

    delete req.session.message;
    delete req.session.orderMessage;
    delete req.session.Posmessage;
    delete req.session.SignUpMessage;
    next();
  });
  app.use(i18n.init);
  app.use(function (req, res, next) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Credentials", true);
    next();
  });
};

module.exports = configViewEngine;
