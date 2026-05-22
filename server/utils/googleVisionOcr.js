const fs = require("fs");
const path = require("path");
const vision = require("@google-cloud/vision");

const defaultKeyFile = path.join(__dirname, "..", "config", "vision-key.json");
const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  (fs.existsSync(defaultKeyFile) ? defaultKeyFile : undefined);

const client = new vision.ImageAnnotatorClient(
  keyFilename ? { keyFilename } : {}
);

async function extractTextFromImage(imageBuffer) {
  const [result] = await client.textDetection({
    image: {
      content: imageBuffer.toString("base64"),
    },
  });

  return result?.fullTextAnnotation?.text || result?.textAnnotations?.[0]?.description || "";
}

async function extractPassportOcr(images) {
  const rotatedFullImages = images.rotatedFullImages || [];
  const ocrTasks = [
    images.fullImage,
    images.mrzImage,
    images.lowerMrzImage,
    ...rotatedFullImages,
  ].map(extractTextFromImage);
  const [fullText, mrzText, lowerMrzText, ...rotatedTexts] =
    await Promise.all(ocrTasks);

  return {
    fullText,
    mrzText,
    lowerMrzText,
    rotatedTexts,
    combinedText: [fullText, mrzText, lowerMrzText, ...rotatedTexts]
      .filter(Boolean)
      .join("\n"),
  };
}

module.exports = {
  extractTextFromImage,
  extractPassportOcr,
};
