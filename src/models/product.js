const mongoose = require("mongoose");

const colorSchema = new mongoose.Schema({
    color: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    serialNumbers: [
       String
    ],
    quantityInStock: {
        type: Number,
        required: true,
        default: 5
    }
});

const capacitySchema = new mongoose.Schema({
    capacity: {
        type: String,
        required: true
    },
    colors: [colorSchema]
});

const productSchema = new mongoose.Schema({
    barcodeUPC: {
        type: String,
        required: true
    },
    barcode: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    importPrice: {
        type: Number,
    },
    retailPrice: {
        type: Number,
    },
    category: {
        type: String,
        ref: 'Category',
        required: true
    },
    brand: {
        type: String,
        required: true
    },
    created: {
        type: Date,
        required: true,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    description: {
        type: String,
    },
    capacities: [capacitySchema],
    url_video: {
        type: String
    }
});

module.exports = mongoose.model('Product', productSchema);
