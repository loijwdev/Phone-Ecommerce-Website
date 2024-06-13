const CDBLogin = require('../models/user');
const bcrypt = require('bcrypt');

const getChangePW = (req, res) => {
  res.render('ChangePW');
};

const changePW = (req, res) => {
  const { newPassword, confirmPassword } = req.body;
  const name = req.session.user.name;
  CDBLogin.findOne({ name: name })
    .then(existingUser => {
      if (existingUser) {
        if (newPassword === confirmPassword) {
          bcrypt.genSalt(10)
            .then(salt => {
              bcrypt.hash(newPassword, salt)
                .then(hashedPassword => {
                  existingUser.password = hashedPassword;
                  existingUser.isFirst = false;
                  existingUser.state = "trực tuyến";
                  existingUser.changepw=true
                  existingUser.save()
                    .then(updatedUser => {
                      res.redirect('/');
                    })
                    .catch(error => {
                      res.send(error.message);
                    });
                })
                .catch(error => {
                  res.send(error.message);
                });
            })
            .catch(error => {
              res.send(error.message);
            });
        } else {
          res.send("Xác nhận mật khẩu sai");
        }
      } else {
        res.redirect('/ChangePW');
        console.log("Lỗi đăng nhập - Người dùng không tồn tại");
      }
    })
    .catch(error => {
      res.status(500).json({ message: error.message });
    });
};
module.exports = {
  getChangePW,
  changePW
};