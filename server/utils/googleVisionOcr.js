const fs = require("fs");
const path = require("path");
const vision = require("@google-cloud/vision");

const defaultKeyFile = path.join(
  __dirname,
  "..",
  "config",
  "vision-key.json"
);

let client;

if (process.env.GOOGLE_CREDENTIALS_JSON) {
  const credentials = JSON.parse(
    process.env.GOOGLE_CREDENTIALS_JSON
  );

  client = new vision.ImageAnnotatorClient({
    credentials,
  });

  console.log("[Vision] Using Render env credentials");
} else if (fs.existsSync(defaultKeyFile)) {
  client = new vision.ImageAnnotatorClient({
    keyFilename: defaultKeyFile,
  });

  console.log("[Vision] Using local vision-key.json");
} else {
  client = new vision.ImageAnnotatorClient();

  console.warn("[Vision] No credentials found");
}

async function extractTextFromImage(imageBuffer) {
  const [result] = await client.textDetection({
    image: {
      content: imageBuffer.toString("base64"),
    },
  });

  return (
    result?.fullTextAnnotation?.text ||
    result?.textAnnotations?.[0]?.description ||
    ""
  );
}

async function extractPassportOcr(images) {
  const rotatedFullImages = images.rotatedFullImages || [];

  const ocrTasks = [
    images.fullImage,
    images.mrzImage,
    images.lowerMrzImage,
    ...rotatedFullImages,
  ].map(extractTextFromImage);

  const [
    fullText,
    mrzText,
    lowerMrzText,
    ...rotatedTexts
  ] = await Promise.all(ocrTasks);

  return {
    fullText,
    mrzText,
    lowerMrzText,
    rotatedTexts,
    combinedText: [
      fullText,
      mrzText,
      lowerMrzText,
      ...rotatedTexts
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

module.exports = {
  extractTextFromImage,
  extractPassportOcr,
};