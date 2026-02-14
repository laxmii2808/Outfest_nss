const mongoose = require("mongoose")

const eventSchema = new mongoose.Schema({

  cameraId: {
    type: String,
    required: true,
    index: true
  },

  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },

  confidence: {
    type: Number,
    required: true
  },

  label: {
    type: String,
    default: "suspicious"
  },

  duration: {
    type: Number,
    default: 5
  },

  fileName: {
    type: String,
    required: true
  },

  filePath: {
    type: String,
    required: true
  },

  fileSize: {
    type: Number
  }

})

module.exports = mongoose.model("Event", eventSchema)
