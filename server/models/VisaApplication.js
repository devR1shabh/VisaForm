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
      issuingCountry: String,
      sex: String,
      dateOfBirth: String,
      expiryDate: String,
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
