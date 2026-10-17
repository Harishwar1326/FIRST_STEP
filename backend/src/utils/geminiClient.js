import axios from "axios";
import { parseJsonObject } from "./groqClient.js";

const GEMINI_API_URL_BASE =
  process.env.GEMINI_API_URL_BASE ||
  "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const GEMINI_JSON_MODEL = process.env.GEMINI_JSON_MODEL || "gemini-1.5-flash";

const resolveGeminiKey = () => {
  const k = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  return k && !k.includes("<") ? k : null;
};

const safeTruncate = (str, maxChars) => {
  if (!str) return str;
  const s = typeof str === "string" ? str : JSON.stringify(str);
  if (s.length <= maxChars) return s;
  const head = s.slice(0, Math.floor(maxChars * 0.8));
  const tail = s.slice(-Math.floor(maxChars * 0.2));
  return `${head}\n...[truncated ${s.length - maxChars} chars]...\n${tail}`;
};

const prepareUserContent = (userPayload, maxChars = 24000) => {
  const raw =
    typeof userPayload === "string"
      ? userPayload
      : JSON.stringify(userPayload, null, 0);
  return safeTruncate(raw, maxChars);
};

export const callGeminiJson = async ({
  systemPrompt,
  userPayload,
  apiKey: requestedApiKey,
  maxTokens = 700,
  temperature = 0.3,
  jsonMode = true,
}) => {
  const apiKey = requestedApiKey || resolveGeminiKey();
  if (!apiKey) return null;

  try {
    const model = jsonMode ? GEMINI_JSON_MODEL : GEMINI_MODEL;
    const endpoint = `${GEMINI_API_URL_BASE}/models/${model}:generateContent?key=${apiKey}`;

    const userContent = prepareUserContent(userPayload);
    const systemContent = systemPrompt && String(systemPrompt).trim();

    const generationConfig = {
      temperature: Math.max(0, Math.min(1, Number(temperature) ?? 0.3)),
      maxOutputTokens: Number(maxTokens) || 700,
      topP: 0.95,
    };

    if (jsonMode) {
      generationConfig.responseMimeType = "application/json";
    }

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: userContent }],
        },
      ],
      generationConfig,
    };

    if (systemContent) {
      payload.systemInstruction = {
        parts: [{ text: systemContent }],
      };
    }

    const response = await axios.post(endpoint, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 45000,
    });

    const candidates = response.data?.candidates;
    if (!Array.isArray(candidates) || candidates.length === 0) return null;

    const first = candidates[0];
    const parts = first.content?.parts;
    if (!Array.isArray(parts) || parts.length === 0) return null;

    const combined = parts
      .map((p) => (p && typeof p.text === "string" ? p.text : ""))
      .join(" ")
      .trim();

    if (!combined) return null;
    return parseJsonObject(combined);
  } catch (_error) {
    return null;
  }
};

export const resolveGeminiKeyPublic = resolveGeminiKey;
export default callGeminiJson;
