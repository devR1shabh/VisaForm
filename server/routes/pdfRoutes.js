const express = require("express");
const PDFDocument = require("pdfkit");
const {
  formatDate,
  normalizeApplicationData,
  safeFallback,
} = require("../utils/formatters");

const router = express.Router();

const pageMargin = 54;
const labelWidth = 155;
const valueWidth = 330;
const rowGap = 7;

function drawDivider(doc) {
  const y = doc.y;

  doc
    .moveTo(pageMargin, y)
    .lineTo(doc.page.width - pageMargin, y)
    .lineWidth(0.6)
    .strokeColor("#C9CED6")
    .stroke();

  doc.strokeColor("black");
  doc.y = y + 10;
}

function drawSectionHeader(doc, text) {
  doc.moveDown(0.75);
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#111827").text(text);
  doc.moveDown(0.15);
  drawDivider(doc);
}

function drawRow(doc, label, value) {
  const x = pageMargin;
  const y = doc.y;
  const normalizedValue = safeFallback(value);

  doc.font("Helvetica-Bold").fontSize(10.5);
  const labelHeight = doc.heightOfString(`${label}:`, {
    width: labelWidth,
  });

  doc.font("Helvetica").fontSize(10.5);
  const valueHeight = doc.heightOfString(normalizedValue, {
    width: valueWidth,
  });

  doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#111827").text(
    `${label}:`,
    x,
    y,
    {
      width: labelWidth,
      lineGap: 1,
    }
  );

  doc.font("Helvetica").fontSize(10.5).fillColor("#111827").text(
    normalizedValue,
    x + labelWidth,
    y,
    {
      width: valueWidth,
      lineGap: 1,
    }
  );

  doc.y = y + Math.max(labelHeight, valueHeight) + rowGap;
}

function drawSection(doc, title, rows) {
  drawSectionHeader(doc, title);

  rows.forEach(([label, value]) => {
    drawRow(doc, label, value);
  });

  doc.moveDown(0.25);
}

router.post("/generate-pdf", async (req, res) => {

  try {

    const applicationData = normalizeApplicationData(req.body);
    const { passportDetails, visaDetails, submittedAt } = applicationData;

    if (
      !passportDetails.name ||
      !passportDetails.passportNumber ||
      !passportDetails.nationality ||
      !passportDetails.sex ||
      !passportDetails.dateOfBirth ||
      !visaDetails.destinationCountry ||
      !visaDetails.visaType ||
      !visaDetails.duration
    ) {
      return res.status(400).json({
        message:
          "Complete all Required passport and visa details before generating the PDF",
      });
    }

    const doc = new PDFDocument({
      size: "A4",
      margin: pageMargin,
    });

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=visa-application.pdf"
    );

    doc.pipe(res);

    doc.font("Helvetica-Bold").fontSize(22).fillColor("#111827").text("Visa Application Summary", {
      align: "center",
    });

    doc.moveDown(0.25);
    doc.font("Helvetica").fontSize(10).fillColor("#374151").text(
      `Submission Date: ${formatDate(String(submittedAt).slice(0, 10))}`,
      {
        align: "center",
      }
    );

    doc.moveDown(1);

    drawSection(doc, "Applicant Information", [
      ["Name", safeFallback(passportDetails.name, "Not detected")],
    ]);

    drawSection(doc, "Passport Information", [
      [
        "Passport Number",
        safeFallback(passportDetails.passportNumber, "Not detected"),
      ],
      ["Nationality", safeFallback(passportDetails.nationality, "Not detected")],
      ["Gender", safeFallback(passportDetails.sex, "Not detected")],
      [
        "Date of Birth",
        passportDetails.dateOfBirth
          ? formatDate(passportDetails.dateOfBirth)
          : "Not detected",
      ],
    ]);

    drawSection(doc, "Visa Information", [
      ["Destination Country", safeFallback(visaDetails.destinationCountry)],
      ["Visa Type", safeFallback(visaDetails.visaType)],
      ["Purpose of Visit", safeFallback(visaDetails.travelPurpose)],
      ["Duration of Stay", safeFallback(visaDetails.duration)],
      ["Travel Date", formatDate(visaDetails.travelDate)],
      ["Accommodation Details", safeFallback(visaDetails.accommodationDetails)],
      ["Additional Notes", safeFallback(visaDetails.additionalNotes)],
    ]);

    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827").text(
      "Visa application submitted and PDF generated successfully."
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
