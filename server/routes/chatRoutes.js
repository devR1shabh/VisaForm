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

    const result = await model.generateContent(userMessage);

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