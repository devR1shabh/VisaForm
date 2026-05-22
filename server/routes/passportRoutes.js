const express = require("express");

const { buildPassportImages } = require("../utils/passportPreprocess");
const { extractPassportOcr } = require("../utils/googleVisionOcr");
const {
  emptyPassportData,
  parseMrz,
  parseOcrFallback,
  sexLabel,
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
  const sex = passportData.sex || "";
  const gender = passportData.gender || sexLabel(sex);

  return {
    fullName,
    passportNumber: passportData.passportNumber || "",
    nationality: passportData.nationality || "",
    issuingCountry: passportData.issuingCountry || "",
    sex,
    dateOfBirth: passportData.dateOfBirth || "",
    expiryDate: passportData.expiryDate || "",
    name: fullName,
    gender,
  };
}

function responseData(passportData = {}) {
  return {
    fullName: passportData.fullName || "",
    passportNumber: passportData.passportNumber || "",
    nationality: passportData.nationality || "",
    issuingCountry: passportData.issuingCountry || "",
    sex: passportData.sex || "",
    dateOfBirth: passportData.dateOfBirth || "",
    expiryDate: passportData.expiryDate || "",
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
    console.log("[api/passport] Google Vision OCR completed", {
      fullTextLength: ocrResult.fullText.length,
      mrzTextLength: ocrResult.mrzText.length,
      lowerMrzTextLength: ocrResult.lowerMrzText.length,
      rotatedTextLengths: ocrResult.rotatedTexts.map((text) => text.length),
    });

    const mrzResult = parseMrz(ocrResult.combinedText);
    const selectedResult = mrzResult.success
      ? mrzResult
      : parseOcrFallback(ocrResult.combinedText);
    const passportData = compatiblePassportData(selectedResult.passportData);
    const data = responseData(passportData);

    if (!selectedResult.success) {
      console.log("[api/passport] MRZ not detected clearly", {
        mrzConfidence: mrzResult.confidence,
        fallbackConfidence: selectedResult.confidence,
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
      source: mrzResult.success ? "mrz" : "ocr-fallback",
      confidence: selectedResult.confidence,
      checks: selectedResult.checks || {},
      mrzLines: mrzResult.mrzLines || [],
      fields: data,
    });

    return res.json({
      success: true,
      data,
      passportData,
    });
  } catch (error) {
    console.log("[api/passport] Vision OCR failed:", error.message);

    return res.json({
      success: false,
      message: "Could not detect passport details clearly.",
      data: responseData(emptyPassportData()),
      passportData: compatiblePassportData(emptyPassportData()),
    });
  }
});

module.exports = router;
