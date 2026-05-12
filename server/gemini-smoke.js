require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

async function main() {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  const masked =
    apiKey.length >= 10 ? `${apiKey.slice(0, 6)}…${apiKey.slice(-4)}` : "(missing)";

  console.log("GEMINI_API_KEY present:", Boolean(apiKey), "masked:", masked, "len:", apiKey.length);

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY in environment.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const wantedModel = "gemini-flash-latest";

  try {
    const model = genAI.getGenerativeModel({ model: wantedModel });
    const result = await model.generateContent("Reply with exactly: OK");
    console.log("Gemini response:", result.response.text());
  } catch (err) {
    if (err && err.status === 404) {
      console.error(`Model "${wantedModel}" not found / unsupported. Listing available models...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
        apiKey
      )}`;
      const resp = await fetch(url);
      const body = await resp.text();
      if (!resp.ok) {
        console.error("ListModels failed:", resp.status, resp.statusText);
        console.error(body);
      } else {
        const json = JSON.parse(body);
        const models = (json.models || []).map((m) => ({
          name: m.name,
          supportedGenerationMethods: m.supportedGenerationMethods
        }));
        const generatable = models.filter((m) =>
          (m.supportedGenerationMethods || []).includes("generateContent")
        );
        console.log(
          "Models supporting generateContent (first 25):\n" +
            generatable
              .slice(0, 25)
              .map((m) => `- ${m.name}`)
              .join("\n")
        );
      }
    }
    throw err;
  }
}

main().catch((err) => {
  console.error("Gemini smoke test failed.");
  console.error(err);
  // SDK errors often contain useful fields on `err`:
  // - err.message
  // - err.status / err.code
  // - err.errorDetails / err.response
  process.exitCode = 1;
});

