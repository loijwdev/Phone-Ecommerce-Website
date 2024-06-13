const mongoose = require('mongoose');
const Schema=mongoose.Schema;
const User = new Schema(
    {
        email:{
            type:String,
            required:true
        },
        name:{
            type:String,
            required:true
        },
        password:{
            type:String,
            required:true
        },
        isFirst:{
            type: Boolean,
            default: true
        },
        role:{
            type: String,
            default: "saleperson"
        },
        state:{
            type: String,
            default: "ngoại tuyến"
        },
        firstname: {
            type: String,
        },
        lastname: {
            type: String,
        },
        phone: {
            type: String,
        },
        birthday: {
            type: String,
        },
        avt:{
            type: String   ,   
        },
        lock:{
            type: Boolean,
            default:false
        },
        isActive: {
            type: Boolean,
            default: false
        },
        activationToken: {
            type: String,
        },
        changepw:{
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true,
    },
);
module.exports=mongoose.model('User',User);









     
