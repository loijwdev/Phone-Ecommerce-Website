const CDBLogin = require('../models/user');
const fs = require("fs");
const express = require("express");
const mongoose = require("mongoose");

const getProfile = (req, res) => {
    res.render('profile');
  }; 
  const showUserInfo = async (req, res) => {
    if (req.session.user) {
      const { _id } = req.session.user;
      try {
        const user = await CDBLogin.findById(_id);
  
        if (user) {
          const { name, email, role, state, _id, lastname, firstname, birthday, phone, avt } = user;
          res.render('profile', { name, email, role, state, _id, lastname, firstname, birthday, phone, avt });
        } else {
          res.redirect('/login');
        }
      } catch (error) {
        res.redirect('/login');
      }
    } else {
      res.redirect('/login');
    }
  };

const editProfile = async (req, res) => {
  try {
    const { _id, firstname, role, avt } = req.session.user;
    const profile = await CDBLogin.findById(_id).exec();

    if (!profile) {
      return res.redirect("/profile");
    }

    res.render("editProfile", {
      profile: profile,
      firstname,
      role,
      avt,
    });
  } catch (err) {
    console.error(err);
    res.redirect("/profile");
  }
};
const updateProfile = async (req, res) => {
  const id = req.params.id;
  const newAvt = req.file ? req.file.filename : req.body.old_avt;

  try {
    const updatedProfile = await CDBLogin.findByIdAndUpdate(
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

    if (!updatedProfile) {
      throw new Error("Profile not found");
    }
    if (req.file && req.body.old_avt) {
      const filePath = `./src/public/uploads/${req.body.old_avt}`;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    const updatedProfileInDB = await CDBLogin.findById(id).exec();
    req.session.user = updatedProfileInDB;
    req.session.save((err) => {
      if (err) {
        throw err;
      }
      res.redirect("/profile");
    });
  } catch (err) {
    console.error(err);
    req.session.message = {
      type: "danger",
      message: err.message,
    };
    res.redirect("/profile");
  }
};
  
  module.exports = {
    getProfile,
    showUserInfo,
    editProfile,
    updateProfile,
};