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

/** Override in `.env` if a model is overloaded or unavailable for your key, e.g. `GEMINI_MODEL=gemini-flash-latest`. */
const GEMINI_MODEL = (process.env.GEMINI_MODEL || "gemini-1.5-flash").trim();

const GEMINI_RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

const GEMINI_MAX_ATTEMPTS = 5;
const GEMINI_BASE_DELAY_MS = 900;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** SDK uses `err.status` (number); fall back to parsing `[503 Service Unavailable]` from `err.message`. */
function getHttpStatus(err) {
  if (err == null) return undefined;
  const direct = Number(err.status);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const m = String(err.message || "").match(/\[(\d{3})\s/);
  if (m) return Number(m[1]);
  return undefined;
}

/** Content/safety errors include `response` and no HTTP status — retrying will not help. */
function isRetryableGeminiError(err) {
  if (err && err.response != null && getHttpStatus(err) == null) {
    return false;
  }
  const status = getHttpStatus(err);
  if (status != null && GEMINI_RETRYABLE_STATUS.has(status)) {
    return true;
  }
  const msg = String(err?.message || "").toLowerCase();
  if (msg.includes("resource exhausted") || msg.includes("too many requests")) return true;
  if (msg.includes("try again later") || msg.includes("overloaded") || msg.includes("high demand")) {
    return true;
  }
  if (msg.includes("503") || msg.includes("service unavailable")) return true;
  return false;
}

/**
 * Retries on transient overload / gateway / rate-limit style failures.
 * Does not retry safety/blocked responses (those are not HTTP transport errors).
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
      const status = getHttpStatus(err);
      const retryable = isRetryableGeminiError(err);
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

      const delayMs =
        GEMINI_BASE_DELAY_MS * 2 ** (attempt - 1) + Math.floor(Math.random() * 500);
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

    const status = getHttpStatus(error);
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