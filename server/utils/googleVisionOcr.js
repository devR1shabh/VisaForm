const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const vision = require("@google-cloud/vision");

const defaultKeyFile = path.join(
  __dirname,
  "..",
  "config",
  "vision-key.json"
);

let client;

function parseCredentialsJson(value) {
  const rawValue = String(value || "").trim();

  try {
    return JSON.parse(rawValue);
  } catch (jsonError) {
    try {
      return JSON.parse(Buffer.from(rawValue, "base64").toString("utf8"));
    } catch (base64Error) {
      throw new Error(
        "GOOGLE_CREDENTIALS_JSON must be valid service-account JSON or base64-encoded JSON"
      );
    }
  }
}

function normalizePrivateKey(privateKey = "") {
  return String(privateKey)
    .replace(/^["']|["']$/g, "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();
}

function loadEnvCredentials() {
  const credentialsValue =
    process.env.GOOGLE_CREDENTIALS_JSON_BASE64 ||
    process.env.GOOGLE_CREDENTIALS_JSON;
  const credentials = parseCredentialsJson(credentialsValue);

  if (credentials.private_key) {
    credentials.private_key = normalizePrivateKey(credentials.private_key);
  }

  if (!credentials.client_email || !credentials.private_key) {
    throw new Error(
      "GOOGLE_CREDENTIALS_JSON is missing client_email or private_key"
    );
  }

  try {
    crypto.createPrivateKey(credentials.private_key);
  } catch (error) {
    throw new Error(
      "GOOGLE_CREDENTIALS_JSON private_key is not a valid PEM key. Re-copy the service account JSON or set GOOGLE_CREDENTIALS_JSON_BASE64."
    );
  }

  return credentials;
}

if (
  process.env.GOOGLE_CREDENTIALS_JSON ||
  process.env.GOOGLE_CREDENTIALS_JSON_BASE64
) {
  const credentials = loadEnvCredentials();

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
