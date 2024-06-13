const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Customer = require("../../models/customer");

const getPage = (req, res) => {
  res.render("customer/auth_page");
};

function generateToken(payload, secretKey) {
  const token = jwt.sign(payload, secretKey);
  return token;
}

const signUp = (req, res) => {
  const { email, name, phone, password, username, confirm_password } = req.body;
  if (password !== confirm_password) {
    req.session.message = {
      type: "danger",
      message: "Mật khẩu không khớp",
    };
    res.redirect("/cus/auth");
  } else {
    Customer.findOne({ $or: [{ name: name }, { email: email }] }).then(
      (existingCustomer) => {
        if (existingCustomer) {
          return res.render("customer/auth_page", {
            error: "User details already exist",
          });
        } else {
          bcrypt
            .hash(password, 10)
            .then((hashedPassword) => {
              const activationToken = crypto.randomBytes(32).toString("hex");
              const newCustomer = new Customer({
                email: email,
                name: name,
                phone: phone,
                username: username,
                password: hashedPassword,
                activationToken: activationToken,
              });
              return newCustomer.save();
            })
            .then((newCustomer) => {
              let transporter = nodemailer.createTransport({
                service: "Gmail",
                auth: {
                  user: process.env.USER,
                  pass: process.env.PASS,
                },
              });
              const secretKey = "signupCus";
              const payload = {
                email: newCustomer.email,
                activationToken: newCustomer.activationToken,
              };
              const token = generateToken(payload, secretKey);
              const activationLink =
                process.env.url_domain + `/cus/auth/activate?token=${token}`;

              let mailOptions = {
                from: "nguyenquangloi2666@gmail.com",
                to: newCustomer.email,
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
              req.session.message = {
                type: "success",
                message: "Hãy kiểm tra email để kích hoạt tài khoản",
              };
              res.redirect("/cus/auth");
            });
        }
      }
    );
  }
};

const activateAccount = async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(404).send("Đường link kích hoạt không hợp lệ");
  }

  try {
    const decodedToken = jwt.verify(token, "signupCus");

    const customer = await Customer.findOneAndUpdate(
      {
        email: decodedToken.email,
        activationToken: decodedToken.activationToken,
      },
      { $set: { isActive: true, activationToken: null } },
      { new: true }
    );

    if (!customer) {
      return res.status(404).send("Đường link kích hoạt không hợp lệ");
    }

    // Redirect to the login page or a success page
    res.redirect("/cus/auth");
  } catch (err) {
    res.status(500).send("Đường link kích hoạt không hợp lệ");
  }
};

const login = (req, res) => {
  const { username, password } = req.body;
  Customer.findOne({ username: username }).then((existingCustomer) => {
    if (existingCustomer && existingCustomer.isActive) {
      bcrypt.compare(password, existingCustomer.password).then((match) => {
        if (match) {
          req.session.customer = {
            username: existingCustomer.username,
            email: existingCustomer.email,
            _id: existingCustomer._id,
            phone: existingCustomer.phone,
            address: existingCustomer.address,
            gender: existingCustomer.gender,
            name: existingCustomer.name,
          };
          res.redirect("/index");
        } else {
          req.session.message = {
            type: "danger",
            message: "Sai tên đăng nhập hoặc mật khẩu",
          };
          res.redirect("/cus/auth");
        }
      });
    } else {
      req.session.message = {
        type: "danger",
        message: "Tài khoản chưa được kích hoạt",
      };
      res.redirect("/cus/auth");
    }
  });
};

const logout = (req, res) => {
  req.session.destroy();
  res.redirect("/cus/auth");
};

module.exports = { getPage, signUp, activateAccount, login, logout };
