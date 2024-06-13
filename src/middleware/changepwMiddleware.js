const User = require("../models/user");
async function ischangepw(req, res, next) {
  if (req.session.user.name) {
    const sessionName = req.session.user.name;
    try {
      const user = await User.findOne({ name: sessionName });
      if (user.changepw === true) {
        return next();
      } else {
        return res.redirect("/ChangePW");
      }
    } catch (error) {
      return res.redirect("/login");
    }
  } else {
    return res.redirect("/login");
  }
}

module.exports = ischangepw;
