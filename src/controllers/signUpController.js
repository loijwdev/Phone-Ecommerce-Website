const bcrypt = require("bcrypt");
const CDBLogin = require("../models/user");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const moment = require("moment");

const getSignUp = (req, res) => {
  res.render("signup", { error: null });
};

function generateToken(payload, secretKey) {
  const token = jwt.sign(payload, secretKey, { expiresIn: "60s" });
  return token;
}
const checkSignup = (req, res, next) => {
  const { email, role, lastname, firstname } = req.body;
  const name = email.split("@")[0]; 
  const password = name;
  if (req.session.user) {
    CDBLogin.findOne({ $or: [{ name: name }, { email: email }] })
      .then((existingUser) => {
        if (existingUser) {
          return res.render("signup", { error: "User details already exist" });
        } else {
          bcrypt
            .hash(password, 10)
            .then((hashedPassword) => {
              const activationToken = crypto.randomBytes(32).toString("hex");
              const newUser = new CDBLogin({
                email: email,
                name: name,
                firstname: firstname,
                lastname:lastname,
                password: hashedPassword,
                activationToken: activationToken,
              });

              return newUser.save();
            })
            .then((newUser) => {
              let transporter = nodemailer.createTransport({
                service: "Gmail",
                auth: {
                  user: process.env.USER,
                  pass: process.env.PASS,
                },
              });
              const secretKey = "signup";
              const payload = {
                email: newUser.email,
                activationToken: newUser.activationToken,
              };
              const token = generateToken(payload, secretKey);
              const activationLink = `http://localhost:3031/signup/activate?token=${token}`;

              let mailOptions = {
                from: "dacbinhct123@gmail.com",
                to: newUser.email,
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
                message: "Đã gửi email cho nhân viên",
              };
              res.redirect("/signup");
            })
            .catch((error) => {
              res.send("Error: " + error.message);
            });
        }
      })
      .catch((error) => {
        res.status(500).json({ message: error.message });
      });
  } else {
    res.redirect("/login");
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
    // Redirect to the login page or a success page
    res.redirect("/login");
  } catch (err) {
    res.status(500).send("Đường link kích hoạt đã hết hạn");
  }
};
module.exports = {
  getSignUp,
  checkSignup,
  activateAccount,
};
