const bcrypt = require("bcrypt");
const CDBLogin = require("../models/user");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const moment = require("moment");

const getLink = (req, res) => {
  res.render("requireLink", { error: null });
};

const generateToken = (payload, secretKey) => {
  return jwt.sign(payload, secretKey, { expiresIn: "1h" });
};
const checkLink = async (req, res, next) => {
  const { email } = req.body;
  try {
    const existingUser = await CDBLogin.findOne({ email: email });

    if (!existingUser) {
      return res.render("signup", { error: "User does not exist" });
    }

    if (existingUser.isActive) {
      return res.render("signup", { error: "Account is already activated" });
    }

    const secretKey = "signup";
    const payload = {
      email: existingUser.email,
      activationToken: existingUser.activationToken,
    };
    const token = generateToken(payload, secretKey);
    const activationLink = `http://localhost:3031/signup/activate?token=${token}`;

    let transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: "dacbinhct123@gmail.com",
        pass: "xutzcyyrawffcbbc",
      },
    });

    let mailOptions = {
      from: "dacbinhct123@gmail.com",
      to: existingUser.email,
      subject: "Activate your account",
      html: `<p>Click the link below to activate your account:</p><a href="${activationLink}">Activate</a>`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });

    req.session.SignUpMessage = {
      type: "success",
      message: "Đã gửi email kích hoạt tài khoản",
    };
    res.redirect("/signup");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const activateAccount = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(404).send("Đường link kích hoạt đã hết hạn");
  }

  try {
    const decodedToken = jwt.verify(token, "signup");

    const expirationTime = moment(decodedToken.createdAt).add(1, "minutes");
    const currentTime = moment();

    if (currentTime.isAfter(expirationTime)) {
      return res.sendStatus(500);
    }

    const user = await CDBLogin.findOneAndUpdate(
      {
        email: decodedToken.email,
        activationToken: decodedToken.activationToken,
      },
      { $set: { isActive: true, activationToken: null } },
      { new: true }
    );

    if (!user) {
      return res.status(404).send("Đường link kích hoạt đã hết hạn");
    }

    res.redirect("/login");
  } catch (err) {
    res.status(500).send("Đường link kích hoạt đã hết hạn");
  }
};


  module.exports = {
    getLink,
    checkLink,
    activateAccount,
  };
  