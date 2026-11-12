export const parseJsonObject = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  let trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) trimmed = fenceMatch[1].trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  const firstBracket = trimmed.indexOf('[');
  let candidate = trimmed;
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace && (firstBracket === -1 || firstBrace < firstBracket)) {
    candidate = trimmed.slice(firstBrace, lastBrace + 1);
  }
  try {
    return JSON.parse(candidate);
  } catch {
    try {
      return JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1').replace(/\bNaN\b/g, 'null').replace(/\bInfinity\b/g, 'null'));
    } catch {
      return null;
    }
  }
};
