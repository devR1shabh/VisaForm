const axios = require("axios");
const FormData = require("form-data");

const OCR_SPACE_URL = "https://api.ocr.space/parse/image";

async function extractTextFromImage(imageBuffer) {
  if (!process.env.OCR_SPACE_API_KEY) {
    throw new Error("OCR_SPACE_API_KEY is not configured");
  }

  const form = new FormData();
  form.append("file", imageBuffer, {
    filename: "passport.jpg",
    contentType: "image/jpeg",
  });
  form.append("OCREngine", "2");
  form.append("scale", "true");
  form.append("detectOrientation", "true");
  form.append("language", "eng");
  form.append("isTable", "false");

  const response = await axios.post(OCR_SPACE_URL, form, {
    headers: {
      ...form.getHeaders(),
      apikey: process.env.OCR_SPACE_API_KEY,
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 45000,
  });

  const result = response.data;
  const parsedResults = Array.isArray(result?.ParsedResults)
    ? result.ParsedResults
    : [];
  const text = parsedResults
    .map((entry) => entry?.ParsedText || "")
    .filter(Boolean)
    .join("\n");

  if (result?.IsErroredOnProcessing) {
    const message =
      result?.ErrorMessage ||
      result?.ErrorDetails ||
      "OCR.space could not process the image";
    throw new Error(Array.isArray(message) ? message.join("; ") : message);
  }

  return text;
}

module.exports = {
  extractTextFromImage,
};
