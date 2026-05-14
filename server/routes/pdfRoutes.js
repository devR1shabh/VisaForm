const express = require("express");
const PDFDocument = require("pdfkit");

const router = express.Router();

router.post("/generate-pdf", async (req, res) => {

  try {

    const {
      country,
      purpose,
      duration,
      travelDate
    } = req.body;

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

    doc.fontSize(14).text(`Destination Country: ${country}`);

    doc.moveDown();

    doc.text(`Purpose of Visit: ${purpose}`);

    doc.moveDown();

    doc.text(`Duration of Stay: ${duration}`);

    doc.moveDown();

    doc.text(`Travel Date: ${travelDate}`);

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