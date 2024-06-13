const mongoose = require('mongoose');
const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    active: {
        type: Boolean,
        default: true
    },
    created: {
        type: Date,
        required: true,
        default: Date.now
    },
});

module.exports = mongoose.model('Category', categorySchema)
