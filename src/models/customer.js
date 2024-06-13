const mongoose = require("mongoose")
const shippingInfoSchema = new mongoose.Schema({
    fullname: {type: String, required: true},
    phone: {type: String, required: true},
    address: {type: String, required:true}, 
});
const customertSchema = new mongoose.Schema({
    email:String,
    password:String,
    username: String,
    isActive: {
        type: Boolean,
        default: false
    },
    activationToken: {
        type: String,
    },
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    shippingInfo: [shippingInfoSchema],
})

module.exports = mongoose.model('Customer',customertSchema)