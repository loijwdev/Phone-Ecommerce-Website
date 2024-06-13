const CDBLogin = require("../models/user");
const { mutipleMongooseToObject } = require("../util/mongoose");
const moment = require("moment");
const bcrypt = require("bcrypt");

const isAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === "admin") {
    next();
  } else {
    res.redirect("/");
  }
};

const adminPage = (req, res) => {
  const {
    name,
    email,
    role,
    state,
    _id,
    lastname,
    firstname,
    birthday,
    phone,
    avt,
  } = req.session.user;
  res.render("staff", { firstname, role, avt });
};

// const showUserInfo = (req, res) => {
//   if (req.session.user) {
//     const { name, email, role, state,_id,lastname,firstname,birthday,phone } = req.session.user;
//     console.log('Người dùng đã đăng nhập:', name);
//     res.render('staff', { name, email, role,state,lastname,firstname });
//   } else {
//     console.log('Không có người dùng đăng nhập');
//     res.redirect('/login');
//   }
// };

// const memberCDBlogin = (req, res, next) => {
//   CDBLogin.find({})
//     .then(cdblogins => {
//       const { name, email, role, state,_id,lastname,firstname,birthday,phone } = req.session.user;
//       res.render('staff', {
//         cdblogins: mutipleMongooseToObject(cdblogins), firstname, role
//       });
//     })
//     .catch(next);
// };

const getStaff = async (req, res) => {
  try {
    const {
      name,
      email,
      role,
      state,
      _id,
      lastname,
      firstname,
      birthday,
      phone,
      avt,
    } = req.session.user;
    let { page, pageSize, search } = req.query;

    // Set default values if not provided
    page = page ? parseInt(page, 10) : 1;
    pageSize = pageSize ? parseInt(pageSize, 10) : 5;

    // Create a MongoDB query object based on search criteria
    const query = {
      role: { $ne: "admin" }, // Exclude users with the role 'admin'
    };
    if (search) {
      query.name = { $regex: new RegExp(search, "i") }; // Case-insensitive search on the 'name' field
    }

    // Fetch staff members with pagination and search
    const staffs = await CDBLogin.find(query)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .exec();

    const totalStaffs = await CDBLogin.countDocuments(query);

    const totalPages = Math.ceil(totalStaffs / pageSize);

    const pagination = {
      pages: Array.from({ length: totalPages }, (_, i) => ({
        page: i + 1,
        isCurrent: i + 1 === page,
      })),
      pageSize,
      currentPage: page,
      totalStaffs,
    };

    // Include information about the previous and next pages
    if (page > 1) {
      pagination.prevPage = page - 1;
    }

    if (page < totalPages) {
      pagination.nextPage = page + 1;
    }

    const plainStaffs = staffs.map((staff) => ({
      ...staff.toJSON(),
      created: moment(staff.created).format("DD/MM/YYYY HH:mm:ss"),
    }));

    res.render("staff", {
      staffs: plainStaffs,
      firstname,
      avt,
      role,
      totalPages,
      search,
      pagination,
      avt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const editStaff = async (req, res) => {
  try {
    const id = req.params.id;
    const staff = await CDBLogin.findById(id).exec();
    if (!staff) {
      return res.redirect("/staff");
    }
    res.render("editStaff", {
      staff: staff,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/staff");
  }
};
const deleteStaff = async (req, res) => {
  let id = req.params.id;
  CDBLogin.findOneAndDelete({ _id: id })
    .exec()
    .then(() => {
      req.session.message = {
        type: "danger",
        message: "Member deleted successfully",
      };
      res.redirect("/staff");
    })
    .catch((err) => {
      res.json({ message: err.message });
    });
};
const lockMember = async (req, res) => {
  try {
    const id = req.params.id;

    const lockMember = await CDBLogin.findByIdAndUpdate(
      id,
      {
        lock: true,
      },
      { new: true }
    ).exec();
    req.session.message = {
      type: "success",
      message: "This account has been locked",
    };
    res.redirect("/staff");
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: err.message,
    };
    res.redirect("/staff");
  }
};
const unlockMember = async (req, res) => {
  try {
    const id = req.params.id;

    const lockMember = await CDBLogin.findByIdAndUpdate(
      id,
      {
        lock: false,
      },
      { new: true }
    ).exec();

    req.session.message = {
      type: "success",
      message: "This account has been unlocked",
    };
    res.redirect("/staff");
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: err.message,
    };
    res.redirect("/staff");
  }
};
const updateProfilebyAdmin = async (req, res) => {
  const id = req.params.id;
  const newAvt = req.file ? req.file.filename : req.body.old_avt;

  try {
    const updatedProfilebyAdmin = await CDBLogin.findByIdAndUpdate(
      id,
      {
        lastname: req.body.lastname,
        firstname: req.body.firstname,
        birthday: req.body.birthday,
        phone: req.body.phone,
        avt: newAvt,
      },
      { new: true }
    ).exec();

    if (!updatedProfilebyAdmin) {
      throw new Error("Profile not found");
    }
    if (req.file && req.body.old_avt) {
      const filePath = `./uploads/${req.body.old_avt}`;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    req.session.message = {
      type: "success",
      message: "Profile updated successfully",
    };
    res.redirect("/staff");
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: err.message,
    };
    res.redirect("/");
  }
};
const defaultpassword = async (req, res) => {
  try {
    const id = req.params.id;
    const defaultPassword = "123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const updatedUser = await CDBLogin.findOneAndUpdate(
      { _id: id },
      { password: hashedPassword },
      { new: true }
    );
    if (!updatedUser) {
      req.session.message = {
        type: "danger",
        message: "Không tìm thấy người dùng",
      };
      return res.redirect("/staff");
    }
    req.session.message = {
      type: "success",
      message: "Khôi phục mật khẩu thành công",
    };
    res.redirect("/staff");
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: err.message,
    };
    res.redirect("/staff");
  }
};
module.exports = {
  isAdmin,
  adminPage,
  editStaff,
  deleteStaff,
  lockMember,
  unlockMember,
  getStaff,
  updateProfilebyAdmin,
  defaultpassword,
};
