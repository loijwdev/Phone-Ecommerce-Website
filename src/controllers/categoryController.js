const Category = require("../models/category");
const moment = require("moment");

const getPageCategory = async (req, res) => {
  const { role, firstname, avt } = req.session.user;

  try {
    const categories = await Category.find().exec();
    const plainCategories = categories.map((category) => ({
      ...category.toJSON(),
      created: moment(category.created).format("DD/MM/YYYY HH:mm:ss"),
      role,
    }));

    res.render("category", {
      role,
      firstname,
      avt,
      categories: plainCategories,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
};

const createCategory = async (req, res) => {
  try {
    const name = req.body.name;
    const category = new Category({ name });
    await category.save();
    req.session.message = {
      type: "success",
      message: "Category added successfully",
    };
    res.redirect("/category");
  } catch (error) {
    req.session.message = {
      type: "danger",
      message: err.message,
    };
  }
};

const updateCategory = async (req, res) => {
  try {
    const id = req.body.id;
    const newName = req.body.name;

    const category = await Category.findOneAndUpdate(
      { _id: id },
      { name: newName },
      { new: true }
    );

    if (!category) {
      return res.redirect("/category");
    }
    req.session.message = {
      type: "success",
      message: "Category edited successfully",
    };
    res.redirect("/category"); // Redirect to the category page after successful update
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: err.message,
    };
    res.redirect("/category");
  }
};

const deleteCategory = async (req, res) => {
    try {
      const id = req.params.id;
      await Category.deleteOne({ _id: id }).exec();
      res.json({ success: true, message: 'Category deleted successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Error deleting category' });
    }
  };
  
  

module.exports = { getPageCategory, createCategory, updateCategory, deleteCategory };
