require("dotenv").config();

async function main() {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  const masked =
    apiKey.length >= 10 ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}` : "(missing)";

  console.log("GEMINI_API_KEY present:", Boolean(apiKey), "masked:", masked, "len:", apiKey.length);

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY in environment.");
  }

  const wantedModel = (process.env.GEMINI_MODEL || "gemini-2.5-flash")
    .trim()
    .replace(/^models\//, "");
  const apiVersion = (process.env.GEMINI_API_VERSION || "v1beta").trim();
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${wantedModel}:generateContent`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Reply with exactly: OK" }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 10,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      }),
    });

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      const message = json?.error?.message || `${response.status} ${response.statusText}`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    const text = json?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();
    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }
    console.log("Gemini response:", text);
  } catch (err) {
    if (err && err.status === 404) {
      console.error(`Model "${wantedModel}" not found / unsupported. Listing available models...`);
      const resp = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models`, {
        headers: { "x-goog-api-key": apiKey },
      });
      const body = await resp.text();
      if (!resp.ok) {
        console.error("ListModels failed:", resp.status, resp.statusText);
        console.error(body);
      } else {
        const json = JSON.parse(body);
        const models = (json.models || []).map((m) => ({
          name: m.name,
          supportedGenerationMethods: m.supportedGenerationMethods,
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
  process.exitCode = 1;
});
