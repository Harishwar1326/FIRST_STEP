import axios from "axios";
import { parseJsonObject } from "./jsonParser.js";

const OPENAI_API_URL = process.env.OPENAI_API_URL || "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

export const callOpenAIJson = async ({ systemPrompt, userPayload, maxTokens = 800, temperature = 0.2 }) => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || apiKey.includes("<")) {
    const error = new Error("OpenAI API key is not configured.");
    error.code = "OPENAI_API_KEY_MISSING";
    throw error;
  }

  try {
    const response = await axios.post(OPENAI_API_URL, {
      model: OPENAI_MODEL,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: typeof userPayload === "string" ? userPayload : JSON.stringify(userPayload ?? {}) },
      ],
    }, {
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      timeout: 15000,
    });

    const parsed = parseJsonObject(response.data?.choices?.[0]?.message?.content);
    if (!parsed) {
      const error = new Error("OpenAI returned an unusable entity details response.");
      error.code = "OPENAI_INVALID_JSON";
      throw error;
    }
    return parsed;
  } catch (error) {
    const apiError = error.response?.data?.error || {};
    const safeError = new Error("OpenAI could not provide entity details.");
    safeError.code = apiError.code || apiError.type || error.code || "OPENAI_REQUEST_FAILED";
    safeError.status = error.response?.status;
    console.warn(`[OpenAI Client] Entity detail request failed${safeError.status ? ` (${safeError.status})` : ""}: ${safeError.code}`);
    throw safeError;
  }
};

export default callOpenAIJson;
