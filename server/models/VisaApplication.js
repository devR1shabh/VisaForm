const mongoose = require("mongoose");

const visaApplicationSchema = new mongoose.Schema(
  {
    destinationCountry: String,
    purposeOfVisit: String,
    durationOfStay: String,
    travelDate: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "VisaApplication",
  visaApplicationSchema
);