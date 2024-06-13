const CDBLogin = require("../models/user");
const bcrypt = require("bcrypt");

const getLogin = (req, res) => {
  res.render("login");
};

const check = (req, res) => {
  const { name, password } = req.body;

  CDBLogin.findOne({ name: name })
    .then((existingUser) => {
      if (existingUser && existingUser.isActive) {
        bcrypt
          .compare(password, existingUser.password)
          .then((match) => {
            if (match) {
              req.session.user = {
                name: existingUser.name,
                email: existingUser.email,
                role: existingUser.role,
                _id: existingUser._id,
                state: existingUser.state,
                firstname: existingUser.firstname,
                lastname: existingUser.lastname,
                phone: existingUser.phone,
                birthday: existingUser.birthday,
                avt: existingUser.avt,
                lock: existingUser.lock,
                changepw: existingUser.changepw,
              };

              if (existingUser.isFirst === false) {
                if (existingUser.lock === true) {
                  res.redirect("login");
                } else {
                  existingUser.state = "trực tuyến";
                  existingUser
                    .save()
                    .then(() => {
                      res.redirect("/");
                    })
                    .catch((error) => {
                      res.send("Error: " + error.message);
                    });
                }
              } else {
                res.redirect("/ChangePW");
              }
            } else {
              res.redirect("/login");
            }
          })
          .catch((error) => {
            res.send("Error: " + error.message);
          });
      } else {
        res.redirect("/login");
      }
    })
    .catch((error) => {
      res.send("Error: " + error.message);
    });
};

const updateStateMiddleware = (req, res, next) => {
  if (req.session && req.session.user) {
    if (req.session.user.state === "trực tuyến") {
      const currentTime = new Date().getTime();
      const sessionExpirationTime = req.session.cookie.expires?.getTime() || 0;
      if (currentTime > sessionExpirationTime) {
        const userId = req.session.user._id;
        CDBLogin.findByIdAndUpdate(userId, { state: "ngoại tuyến" })
          .then(() => {
            req.session.destroy();
          })
          .catch((error) => {
            console.error("Error updating user state:", error);
          });
      }
    }
  }
  next();
};

module.exports = {
  getLogin,
  check,
  updateStateMiddleware,
};
