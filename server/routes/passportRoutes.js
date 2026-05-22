const express = require("express");

const { buildPassportImages } = require("../utils/passportPreprocess");
const { extractPassportOcr } = require("../utils/googleVisionOcr");
const {
  emptyPassportData,
  parseMrz,
  parseOcrFallback,
} = require("../utils/mrzParser");

const router = express.Router();

function decodeBase64Image(imageBase64 = "") {
  const base64 = String(imageBase64).includes(",")
    ? String(imageBase64).split(",").pop()
    : imageBase64;

  return Buffer.from(base64, "base64");
}

function compatiblePassportData(passportData = {}) {
  const fullName = passportData.fullName || passportData.name || "";
  const gender = passportData.gender || passportData.sex || "";

  return {
    passportNumber: passportData.passportNumber || "",
    fullName,
    nationality: passportData.nationality || "",
    gender,
    dateOfBirth: passportData.dateOfBirth || "",
    expiryDate: passportData.expiryDate || "",
    name: fullName,
    sex: gender,
  };
}

router.post("/extract-passport", async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.json({
        success: false,
        message: "Could not detect passport details clearly.",
        passportData: emptyPassportData(),
        ocrText: "",
      });
    }

    const imageBuffer = decodeBase64Image(imageBase64);
    const processedImages = await buildPassportImages(imageBuffer);
    const ocrResult = await extractPassportOcr(processedImages);
    const mrzResult = parseMrz(ocrResult.combinedText);
    const fallbackResult = mrzResult.success
      ? mrzResult
      : parseOcrFallback(ocrResult.combinedText);
    const selectedResult = mrzResult.success ? mrzResult : fallbackResult;
    const passportData = compatiblePassportData(selectedResult.passportData);

    if (!selectedResult.success) {
      return res.json({
        success: false,
        message: "Could not detect passport details clearly.",
        passportData,
        ocrText: ocrResult.combinedText,
      });
    }

    return res.json({
      success: true,
      passportData,
      ocrText: ocrResult.combinedText,
      mrzLines: mrzResult.mrzLines || [],
    });
  } catch (error) {
    console.log("[api/passport] Vision OCR failed:", error.message);

    return res.json({
      success: false,
      message: "Could not detect passport details clearly.",
      passportData: emptyPassportData(),
      ocrText: "",
    });
  }
});

module.exports = router;
