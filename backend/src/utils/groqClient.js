import axios from 'axios'

const GROQ_API_URL = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant'

export const parseJsonObject = (raw) => {
  if (!raw || typeof raw !== 'string') return null
  let trimmed = raw.trim()
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch && fenceMatch[1]) {
    trimmed = fenceMatch[1].trim()
  }
  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  const firstBracket = trimmed.indexOf('[')
  let candidate = trimmed
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    if (firstBracket === -1 || firstBrace < firstBracket) {
      candidate = trimmed.slice(firstBrace, lastBrace + 1)
    }
  }
  try {
    return JSON.parse(candidate)
  } catch (_first) {
    try {
      const safe = candidate
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/\bNaN\b/g, 'null')
        .replace(/\bInfinity\b/g, 'null')
      return JSON.parse(safe)
    } catch (_second) {
      return null
    }
  }
}

export const callGroqJson = async ({
  systemPrompt,
  userPayload,
  maxTokens = 700,
  temperature = 0.3,
}) => {
  if (!process.env.GROQ_API_KEY) return null

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
    return parseJsonObject(content)
  } catch (_error) {
    return null
  }
}

export default callGroqJson
