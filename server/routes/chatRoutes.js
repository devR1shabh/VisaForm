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


router.post("/", async (req, res) => {

  try {

    const userMessage = req.body.message;

    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest"
    });

    const prompt = `
You are an AI Visa Assistant.

Your job is to help users complete a visa application in a simple step-by-step conversational manner.

Rules:
- Ask only ONE question at a time.
- Keep responses short and professional.
- Focus only on visa-related guidance.
- Collect details like:
  - destination country
  - purpose of visit
  - travel duration
  - passport information
  - travel dates
  - accommodation
- Do not generate long essays.
- Behave like a real visa application assistant.

User message:
${userMessage}
`;

const result = await model.generateContent(prompt);

    const response = await result.response;

    const text = response.text();

    res.json({
      reply: text
    });

  } catch (error) {

    console.log("GEMINI ERROR:", error);

    res.status(500).json({
      reply: "Something went wrong."
    });

  }

});

module.exports = router;