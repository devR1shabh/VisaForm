const express = require("express");

const router = express.Router();

const { GoogleGenerativeAI } = require("@google/generative-ai");

function getGenAI() {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY. Check server/.env and dotenv loading order.");
  }
  return new GoogleGenerativeAI(apiKey);
}

const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_RETRYABLE_STATUS = new Set([503, 429]);
const GEMINI_MAX_ATTEMPTS = 3;
const GEMINI_BASE_DELAY_MS = 600;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries only on transient API overload / rate limits (503, 429).
 * Other errors fail fast.
 */
async function generateContentWithRetry(model, prompt) {
  let lastError;
  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt++) {
    const started = Date.now();
    try {
      const result = await model.generateContent(prompt);
      if (attempt > 1) {
        console.log("[api/chat] gemini ok after retry", {
          model: GEMINI_MODEL,
          attempt,
          elapsedMs: Date.now() - started,
        });
      }
      return result;
    } catch (err) {
      lastError = err;
      const status = err?.status;
      const retryable = GEMINI_RETRYABLE_STATUS.has(status);
      console.log("[api/chat] gemini error", {
        model: GEMINI_MODEL,
        attempt,
        status: status ?? "unknown",
        retryable,
        message: err?.message,
      });

      if (!retryable || attempt === GEMINI_MAX_ATTEMPTS) {
        throw err;
      }

      const delayMs = GEMINI_BASE_DELAY_MS * 2 ** (attempt - 1);
      console.log("[api/chat] gemini retry", { delayMs, nextAttempt: attempt + 1 });
      await sleep(delayMs);
    }
  }
  throw lastError;
}


router.post("/", async (req, res) => {

  try {

    const userMessage = req.body.message;

    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
    });

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
      messageLen: typeof userMessage === "string" ? userMessage.length : 0,
    });

    const result = await generateContentWithRetry(model, prompt);

    const response = await result.response;

    const text = response.text();

    res.json({
      reply: text
    });

  } catch (error) {

    const status = error?.status;
    console.log("[api/chat] gemini final failure", {
      status: status ?? "unknown",
      message: error?.message,
    });

    res.status(500).json({
      reply: "Something went wrong."
    });

  }

});

module.exports = router;