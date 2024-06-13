const CDBLogin = require('../models/user');

const logout = async (req, res) => {
  try {
    const {name,state} = req.session.user;
    const existingUser = await CDBLogin.findOneAndUpdate({ name: name }, { state: "ngoại tuyến" }, { new: true });
    req.session.destroy((err) => {
      if (err) {
        console.error("Error while logging out: " + err);
      }
      res.redirect('/login');
    });
  } catch (error) {
    res.send("Error: " + error.message);
  }
};

module.exports = {
  logout
};