import axios from "axios";
import { parseJsonObject } from "./jsonParser.js";

const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5-coder:3b";
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS) || 90000;

export const callOllamaJson = async ({
  systemPrompt,
  userPayload,
  maxTokens = 800,
  temperature = 0.2,
  timeoutMs = OLLAMA_TIMEOUT_MS,
}) => {
  const userContent = typeof userPayload === "string"
    ? userPayload
    : JSON.stringify(userPayload ?? {});

  try {
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/chat`, {
      model: OLLAMA_MODEL,
      stream: false,
      format: "json",
      keep_alive: "5m",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      options: {
        temperature: Math.max(0, Math.min(1, Number(temperature) || 0.2)),
        num_predict: Number(maxTokens) || 800,
      },
    }, {
      headers: { "Content-Type": "application/json" },
      timeout: Number(timeoutMs) > 0 ? Number(timeoutMs) : OLLAMA_TIMEOUT_MS,
    });

    const parsed = parseJsonObject(response.data?.message?.content);
    if (!parsed) {
      const error = new Error("Ollama returned an unusable JSON response.");
      error.code = "OLLAMA_INVALID_JSON";
      throw error;
    }
    console.info(`[Ollama Client] Generated JSON with ${OLLAMA_MODEL}`);
    return parsed;
  } catch (error) {
    const status = error.response?.status;
    const code = error.response?.data?.error || error.code || "OLLAMA_REQUEST_FAILED";
    console.warn(`[Ollama Client] JSON generation failed${status ? ` (${status})` : ""}: ${code}`);
    const safeError = new Error("Ollama could not provide a JSON response.");
    safeError.code = String(code);
    safeError.status = status;
    throw safeError;
  }
};

export default callOllamaJson;
