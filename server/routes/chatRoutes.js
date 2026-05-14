const express = require("express");
const VisaApplication = require("../models/VisaApplication");

const router = express.Router();

function toVisaApplicationPayload(applicationData = {}) {
  const passportDetails = applicationData.passportDetails || {};
  const visaDetails = applicationData.visaDetails || applicationData;

  return {
    destinationCountry:
      visaDetails.destinationCountry || applicationData.country || "",
    visaType: visaDetails.visaType || applicationData.visaType || "",
    purposeOfVisit:
      visaDetails.travelPurpose ||
      visaDetails.purposeOfVisit ||
      applicationData.purpose ||
      "",
    durationOfStay:
      visaDetails.duration ||
      visaDetails.durationOfStay ||
      applicationData.duration ||
      "",
    travelDate: visaDetails.travelDate || applicationData.travelDate || "",
    accommodationDetails:
      visaDetails.accommodationDetails ||
      applicationData.accommodationDetails ||
      "",
    additionalNotes:
      visaDetails.additionalNotes || applicationData.additionalNotes || "",
    passportDetails: {
      name: passportDetails.name || passportDetails.fullName || "",
      passportNumber: passportDetails.passportNumber || "",
      nationality: passportDetails.nationality || "",
      sex: passportDetails.sex || "",
      dateOfBirth: passportDetails.dateOfBirth || "",
    },
    submittedAt: new Date(),
  };
}

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

async function generateGeminiText(prompt) {

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
          parts: [{ text: prompt }],
        },
      ],

      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 80,

        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {

    const message =
      data?.error?.message ||
      `${response.status} ${response.statusText}`;

    const error = new Error(message);

    error.status = response.status;

    throw error;
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

router.post("/save-application", async (req, res) => {
  try {
    const applicationData = req.body.applicationData || req.body;
    const payload = toVisaApplicationPayload(applicationData);

    const savedApplication = await VisaApplication.create(payload);

    res.json({
      success: true,
      applicationId: savedApplication._id,
      submittedAt: payload.submittedAt,
    });
  } catch (error) {
    console.log("[api/chat/save-application] failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to save visa application",
    });
  }
});

router.post("/", async (req, res) => {

  try {

    const { message, applicationData } = req.body;

    const prompt = `
You are an AI Visa Assistant.

Your job is to briefly acknowledge the user's response in a professional and friendly way.

Rules:
- Keep responses VERY short.
- Maximum 1 sentence.
- DO NOT ask follow-up questions.
- DO NOT generate long explanations.
- DO NOT repeat the user's full message.
- Sound natural and professional.

Examples:
User: I want to visit Canada
AI: Understood. Canada is a popular travel destination.

User: Tourism
AI: Thank you for sharing your travel purpose.

User: 2 weeks
AI: Noted. A 2-week stay is common for short-term visits.

User message:
${message}
`;

    const text = await generateGeminiText(prompt);

    // SAVE APPLICATION TO DATABASE
    if (
      applicationData &&
      applicationData.country &&
      applicationData.purpose &&
      applicationData.duration &&
      applicationData.travelDate
    ) {

      await VisaApplication.create(toVisaApplicationPayload(applicationData));
    }

    res.json({
      reply: text,
    });

  } catch (error) {

    console.log("FULL ERROR:", error);

    res.status(500).json({
      reply:
        "AI service is temporarily busy. Please try again in a few seconds.",
    });

  }

});

module.exports = router;
