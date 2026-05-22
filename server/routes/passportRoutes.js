const express = require("express");

const { buildPassportImages } = require("../utils/passportPreprocess");
const { extractTextFromImage } = require("../utils/ocrSpace");
const {
  emptyPassportData,
  parseMrz,
} = require("../utils/mrzParser");
const {
  normalizePassportDetails,
} = require("../utils/passportNormalization");

const router = express.Router();

function decodeBase64Image(imageBase64 = "") {
  const base64 = String(imageBase64).includes(",")
    ? String(imageBase64).split(",").pop()
    : imageBase64;

  return Buffer.from(base64, "base64");
}

function compatiblePassportData(passportData = {}) {
  const normalizedPassportData = normalizePassportDetails(passportData);

  return {
    fullName: normalizedPassportData.fullName,
    passportNumber: normalizedPassportData.passportNumber,
    nationality: normalizedPassportData.nationality,
    issuingCountry: normalizedPassportData.issuingCountry,
    sex: normalizedPassportData.sex,
    dateOfBirth: normalizedPassportData.dateOfBirth,
    expiryDate: normalizedPassportData.expiryDate,
    name: normalizedPassportData.fullName,
  };
}

function responseData(passportData = {}) {
  return {
    fullName: passportData.fullName || "",
    sex: passportData.sex || "",
    nationality: passportData.nationality || "",
    issuingCountry: passportData.issuingCountry || "",
    passportNumber: passportData.passportNumber || "",
    dateOfBirth: passportData.dateOfBirth || "",
    expiryDate: passportData.expiryDate || "",
  };
}

async function extractPassportOcr(images) {
  const ocrInputs = [
    images.mrzImage,
    images.lowerMrzImage,
    images.fullImage,
    ...(images.rotatedFullImages || []),
  ].filter(Boolean);

  const texts = [];

  for (const imageBuffer of ocrInputs) {
    texts.push(await extractTextFromImage(imageBuffer));
  }

  return {
    texts,
    combinedText: texts.filter(Boolean).join("\n"),
  };
}

router.post("/extract-passport", async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.json({
        success: false,
        message: "Could not detect passport details clearly.",
        data: responseData(emptyPassportData()),
        passportData: compatiblePassportData(emptyPassportData()),
      });
    }

    const imageBuffer = decodeBase64Image(imageBase64);
    const processedImages = await buildPassportImages(imageBuffer);
    const ocrResult = await extractPassportOcr(processedImages);
    console.log("[api/passport] OCR.space OCR completed", {
      textLengths: ocrResult.texts.map((text) => text.length),
    });

    const mrzResult = parseMrz(ocrResult.combinedText);
    const passportData = compatiblePassportData(mrzResult.passportData);
    const data = responseData(passportData);

    if (!mrzResult.success) {
      console.log("[api/passport] MRZ not detected clearly", {
        mrzConfidence: mrzResult.confidence,
        mrzLines: mrzResult.mrzLines || [],
      });

      return res.json({
        success: false,
        message: "Could not detect passport details clearly.",
        data,
        passportData,
      });
    }

    console.log("[api/passport] passport extraction completed", {
      source: "mrz",
      confidence: mrzResult.confidence,
      checks: mrzResult.checks || {},
      mrzLines: mrzResult.mrzLines || [],
      fields: data,
    });

    return res.json({
      success: true,
      data,
      passportData,
    });
  } catch (error) {
    console.log("[api/passport] OCR.space OCR failed:", error.message);

    return res.json({
      success: false,
      message: "Could not detect passport details clearly.",
      data: responseData(emptyPassportData()),
      passportData: compatiblePassportData(emptyPassportData()),
    });
  }
});

module.exports = router;
