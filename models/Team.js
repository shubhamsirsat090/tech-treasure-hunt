const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({

  teamNumber: Number,
  teamCode: String,

  route: [String],        // team route
  currentStep: Number,    // position in route

  finished: {
    type: Boolean,
    default: false
  },

  finishTime: Date

});

module.exports = mongoose.model("Team", teamSchema);