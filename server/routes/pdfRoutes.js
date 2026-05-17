const express = require("express");
const PDFDocument = require("pdfkit");

const {
  formatDate,
  normalizeApplicationData,
  safeFallback,
} = require("../utils/formatters");

const router = express.Router();

const pageMargin = 54;
const labelWidth = 165;
const valueWidth = 320;
const rowGap = 14;

function drawDivider(doc) {
  const y = doc.y;

  doc
    .moveTo(pageMargin, y)
    .lineTo(doc.page.width - pageMargin, y)
    .lineWidth(0.6)
    .strokeColor("#D1D5DB")
    .stroke();

  doc.strokeColor("#000000");
  doc.y = y + 10;
}

function drawHeader(doc, applicationData) {
  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .fillColor("#111827")
    .text("Visa Application Summary", {
      align: "center",
    });

  doc.moveDown(0.4);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#4B5563")
    .text(
      `Application ID: ${safeFallback(
        applicationData.applicationId,
        "VA-2026-0001"
      )}`,
      {
        align: "center",
      }
    );

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#4B5563")
    .text(
      `Submission Date: ${formatDate(
        String(applicationData.submittedAt).slice(0, 10)
      )}`,
      {
        align: "center",
      }
    );

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#4B5563")
    .text("Status: Submitted", {
      align: "center",
    });

  doc.moveDown(0.8);

  drawDivider(doc);

  doc.moveDown(0.5);
}

function drawSection(doc, title, rows) {
  doc.moveDown(0.4);

  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor("#111827")
    .text(title);

  doc.moveDown(0.2);

  drawDivider(doc);

  rows.forEach(([label, value]) => {
    drawRow(doc, label, value);
  });

  doc.moveDown(0.4);
}

function drawRow(doc, label, value) {
  const x = pageMargin;
  const y = doc.y;

  const normalizedValue = safeFallback(value);

  doc
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .fillColor("#111827");

  const labelHeight = doc.heightOfString(`${label}:`, {
    width: labelWidth,
  });

  doc
    .font("Helvetica")
    .fontSize(10.5)
    .fillColor("#111827");

  const valueHeight = doc.heightOfString(normalizedValue, {
    width: valueWidth,
  });

  doc
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .fillColor("#111827")
    .text(`${label}:`, x, y, {
      width: labelWidth,
    });

  doc
    .font("Helvetica")
    .fontSize(10.5)
    .fillColor("#111827")
    .text(normalizedValue, x + labelWidth, y, {
      width: valueWidth,
      lineGap: 1,
    });

  doc.y = y + Math.max(labelHeight, valueHeight) + rowGap;
}

function drawFooter(doc) {
  const footerY = doc.page.height - 45;

  doc
    .moveTo(pageMargin, footerY - 10)
    .lineTo(doc.page.width - pageMargin, footerY - 10)
    .lineWidth(0.5)
    .strokeColor("#D1D5DB")
    .stroke();

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#6B7280")
    .text(
      "Visa Portal Prototype • Generated Automatically",
      pageMargin,
      footerY,
      {
        align: "center",
        width: doc.page.width - pageMargin * 2,
      }
    );
}

router.post("/generate-pdf", async (req, res) => {
  try {
    const applicationData = normalizeApplicationData(req.body);

    const {
      passportDetails,
      visaDetails,
      submittedAt,
    } = applicationData;

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
          "Complete all required passport and visa details before generating the PDF.",
      });
    }

    const doc = new PDFDocument({
      size: "A4",
      margin: pageMargin,
    });

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=visa-application.pdf"
    );

    doc.pipe(res);

    drawHeader(doc, applicationData);

    drawSection(doc, "Applicant Information", [
      ["Full Name", safeFallback(passportDetails.name)],
      [
        "Submission Date",
        formatDate(String(submittedAt).slice(0, 10)),
      ],
    ]);

    drawSection(doc, "Passport Information", [
      [
        "Passport Number",
        safeFallback(passportDetails.passportNumber),
      ],
      ["Nationality", safeFallback(passportDetails.nationality)],
      ["Gender", safeFallback(passportDetails.sex)],
      [
        "Date of Birth",
        passportDetails.dateOfBirth
          ? formatDate(passportDetails.dateOfBirth)
          : "Not Provided",
      ],
    ]);

    drawSection(doc, "Visa Information", [
      [
        "Destination Country",
        safeFallback(visaDetails.destinationCountry),
      ],
      ["Visa Type", safeFallback(visaDetails.visaType)],
      [
        "Purpose of Visit",
        safeFallback(visaDetails.travelPurpose),
      ],
      [
        "Duration of Stay",
        safeFallback(visaDetails.duration),
      ],
      [
        "Travel Date",
        visaDetails.travelDate &&
        visaDetails.travelDate !== "Not sure"
          ? formatDate(visaDetails.travelDate)
          : "Not sure",
      ],
      [
        "Additional Notes",
        safeFallback(
          visaDetails.additionalNotes,
          "Not Provided"
        ),
      ],
    ]);

    drawFooter(doc);

    doc.end();
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Failed to generate PDF",
    });
  }
});

module.exports = router;