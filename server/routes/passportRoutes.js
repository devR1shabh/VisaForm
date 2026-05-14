const express = require("express");

const router = express.Router();

function getGeminiApiKey() {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();

  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY. Check server/.env and dotenv loading order."
    );
  }

  return apiKey;
}

const GEMINI_MODEL = (
  process.env.GEMINI_MODEL || "gemini-2.5-flash"
).trim();

const GEMINI_API_VERSION = (
  process.env.GEMINI_API_VERSION || "v1beta"
).trim();

const GEMINI_API_BASE_URL =
  "https://generativelanguage.googleapis.com";

const fallbackPassportData = {
  fullName: "SPECIMEN KUMAR G",
  passportNumber: "Z0000000",
  nationality: "INDIAN",
  dateOfBirth: "24/05/1985",
};

function cleanJsonText(text) {
  const cleanedText = (text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const jsonStart = cleanedText.indexOf("{");
  const jsonEnd = cleanedText.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    return cleanedText;
  }

  return cleanedText.slice(jsonStart, jsonEnd + 1);
}

function parsePassportJson(text) {
  const cleanedText = cleanJsonText(text);

  try {
    return JSON.parse(cleanedText);
  } catch (error) {
    console.log("[api/passport] invalid Gemini JSON:", error.message);
    console.log("[api/passport] raw Gemini response:", text);

    return fallbackPassportData;
  }
}

function normalizePassportData(data) {
  return {
    fullName: data?.fullName || fallbackPassportData.fullName,
    passportNumber:
      data?.passportNumber || fallbackPassportData.passportNumber,
    nationality: data?.nationality || fallbackPassportData.nationality,
    dateOfBirth: data?.dateOfBirth || fallbackPassportData.dateOfBirth,
  };
}

router.post("/extract-passport", async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({
        message: "Passport image is required.",
      });
    }

    const modelName = GEMINI_MODEL.replace(/^models\//, "");

    const url =
      `${GEMINI_API_BASE_URL}/${GEMINI_API_VERSION}/models/${modelName}:generateContent`;

    const response = await fetch(url, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": getGeminiApiKey(),
      },

      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `
Extract these fields from the passport image:
- fullName
- passportNumber
- nationality
- dateOfBirth

Return only valid JSON with these exact keys.
Use dateOfBirth in YYYY-MM-DD format when possible.
If a field is not clear, return an empty string for that field.
`,
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],

        generationConfig: {
          temperature: 0,
          maxOutputTokens: 200,
        },
      }),
    });

    const geminiData = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        geminiData?.error?.message ||
        `${response.status} ${response.statusText}`;

      console.log("[api/passport] Gemini API fallback:", message);

      return res.json({
        passportData: fallbackPassportData,
      });
    }

    const text = geminiData?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

    if (!text) {
      console.log("[api/passport] empty Gemini response, using fallback");

      return res.json({
        passportData: fallbackPassportData,
      });
    }

    const passportData = normalizePassportData(
      parsePassportJson(text)
    );

    res.json({
      passportData,
    });
  } catch (error) {
    console.log("[api/passport] extraction fallback:", error.message);

    res.json({
      passportData: fallbackPassportData,
    });
  }
});

module.exports = router;
