const express = require("express");

const router = express.Router();

function getGeminiApiKey() {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY. Check server/.env and dotenv loading order.");
  }
  return apiKey;
}

/** Override in `.env` only if Google lists another model for your API key. */
const GEMINI_MODEL = (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();
const GEMINI_API_VERSION = (process.env.GEMINI_API_VERSION || "v1beta").trim();
const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com";

function getHttpStatus(err) {
  if (err == null) return undefined;
  const direct = Number(err.status);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const m = String(err.message || "").match(/\[(\d{3})\s/);
  if (m) return Number(m[1]);
  return undefined;
}

async function generateGeminiText(prompt) {
  const modelName = GEMINI_MODEL.replace(/^models\//, "");
  const url = `${GEMINI_API_BASE_URL}/${GEMINI_API_VERSION}/models/${modelName}:generateContent`;

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
      data?.error?.message || `${response.status} ${response.statusText || "Gemini request failed"}`;
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

router.post("/", async (req, res) => {
  try {
    const userMessage = req.body.message;

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
AI: Noted. A two-week stay is common for short-term visits.

User message:
${userMessage}
`;

    console.log("[api/chat] request", {
      model: GEMINI_MODEL,
      apiVersion: GEMINI_API_VERSION,
      messageLen: typeof userMessage === "string" ? userMessage.length : 0,
    });

    const text = await generateGeminiText(prompt);

    res.json({
      reply: text,
    });
  } catch (error) {
    console.log("FULL ERROR:", error);

    const status = getHttpStatus(error);
    console.log("[api/chat] gemini final failure", {
      status: status ?? "unknown",
      message: error?.message,
    });

    res.status(500).json({
      reply: "AI service is temporarily busy. Please try again in a few seconds.",
    });
  }
});

module.exports = router;
