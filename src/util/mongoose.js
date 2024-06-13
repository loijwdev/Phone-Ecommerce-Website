module.exports = {
    mutipleMongooseToObject: function (mongooses) {
      return mongooses.map(mongoose => mongoose.toObject());
    }
  };