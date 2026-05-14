const express = require("express");
const PDFDocument = require("pdfkit");

const router = express.Router();

router.post("/generate-pdf", async (req, res) => {

  try {

    const passportDetails = req.body.passportDetails || {};
    const visaDetails = req.body.visaDetails || {};
    const submittedAt = req.body.submittedAt || new Date().toISOString();

    const destinationCountry =
      visaDetails.destinationCountry || req.body.country || "";
    const visaType = visaDetails.visaType || req.body.visaType || "";
    const purposeOfVisit =
      visaDetails.travelPurpose || req.body.purpose || "";
    const durationOfStay = visaDetails.duration || req.body.duration || "";
    const accommodationDetails =
      visaDetails.accommodationDetails || req.body.accommodationDetails || "";
    const additionalNotes =
      visaDetails.additionalNotes || req.body.additionalNotes || "";
    const travelDate = visaDetails.travelDate || req.body.travelDate || "";

    const doc = new PDFDocument();

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=visa-application.pdf"
    );

    doc.pipe(res);

    doc.fontSize(24).text("Visa Application", {
      align: "center"
    });

    doc.moveDown();

    doc.fontSize(16).text("Applicant Information");

    doc.moveDown(0.5);

    doc.fontSize(12).text(`Name: ${passportDetails.name || "Not provided"}`);

    doc.moveDown();

    doc.fontSize(16).text("Passport Information");

    doc.moveDown(0.5);

    doc.fontSize(12).text(
      `Passport Number: ${passportDetails.passportNumber || "Not provided"}`
    );

    doc.text(`Nationality: ${passportDetails.nationality || "Not provided"}`);
    doc.text(`Sex: ${passportDetails.sex || "Not provided"}`);
    doc.text(
      `Date of Birth: ${passportDetails.dateOfBirth || "Not provided"}`
    );

    doc.moveDown();

    doc.fontSize(16).text("Visa Information");

    doc.moveDown(0.5);

    doc.fontSize(12).text(
      `Destination Country: ${destinationCountry || "Not provided"}`
    );
    doc.text(`Visa Type: ${visaType || "Not provided"}`);
    doc.text(`Purpose of Visit: ${purposeOfVisit || "Not provided"}`);
    doc.text(`Duration of Stay: ${durationOfStay || "Not provided"}`);
    doc.text(
      `Accommodation Details: ${accommodationDetails || "Not provided"}`
    );
    doc.text(`Additional Notes: ${additionalNotes || "Not provided"}`);

    if (travelDate) {
      doc.text(`Travel Date: ${travelDate}`);
    }

    doc.moveDown();

    doc.text(`Submission Timestamp: ${submittedAt}`);

    doc.moveDown(2);

    doc.text(
      "Your visa application has been generated successfully."
    );

    doc.end();

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Failed to generate PDF"
    });

  }

});

module.exports = router;
