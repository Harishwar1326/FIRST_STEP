import axios from 'axios'
import { parseJsonObject } from './jsonParser.js'
import { callOllamaJson } from './ollamaClient.js'

export { parseJsonObject }

const GROQ_API_URL = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant'

export const callGroqJson = async ({
  systemPrompt,
  userPayload,
  maxTokens = 700,
  temperature = 0.3,
}) => {
  const fallback = async (reason) => {
    if (['false', '0', 'off'].includes(String(process.env.OLLAMA_FALLBACK_ENABLED || '').toLowerCase())) return null
    console.info(`[Groq Client] ${reason}; trying local Ollama fallback`)
    try {
      return await callOllamaJson({ systemPrompt, userPayload, maxTokens, temperature })
    } catch {
      return null
    }
  }

  if (!process.env.GROQ_API_KEY) return fallback('GROQ_API_KEY is not configured')

  try {
    const userContent = typeof userPayload === 'string'
      ? userPayload
      : JSON.stringify(userPayload, null, 0)

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 45000,
      }
    )

    const content = response.data?.choices?.[0]?.message?.content
    const parsed = parseJsonObject(content)
    return parsed || fallback('Groq returned invalid or empty JSON')
  } catch (error) {
    return fallback(`Groq request failed (${error.response?.status || error.code || 'network error'})`)
  }
}

export default callGroqJson
