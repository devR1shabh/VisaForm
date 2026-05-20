const mongoose = require("mongoose");

const visaApplicationSchema = new mongoose.Schema(
  {
    destinationCountry: String,
    visaType: String,
    durationOfStay: String,
    additionalNotes: String,
    travelDate: String,
    passportDetails: {
      name: String,
      passportNumber: String,
      nationality: String,
      sex: String,
      dateOfBirth: String,
    },
    submittedAt: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "VisaApplication",
  visaApplicationSchema
);
