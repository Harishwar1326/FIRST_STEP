const BYTES_PER_KIB = 1024;
const CHROMA_DOC_MAX_BYTES = 16 * BYTES_PER_KIB;
const DEFAULT_TARGET_BYTES = 12 * BYTES_PER_KIB;
const DEFAULT_OVERLAP_BYTES = 1 * BYTES_PER_KIB;
const HEADER_ESTIMATE_BYTES = 768;
const CHUNK_CONTENT_MAX = CHROMA_DOC_MAX_BYTES - HEADER_ESTIMATE_BYTES;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const byteLength = (str) => encoder.encode(String(str || "")).length;
const sliceBytes = (str, startByte, endByte) => {
  const encoded = encoder.encode(String(str || ""));
  return decoder.decode(encoded.slice(startByte, endByte));
};

const buildChunkHeader = ({ title, subject, folder, chunkIndex, totalChunks }) => {
  const parts = [];
  if (title) parts.push(`Title: ${String(title).slice(0, 120)}`);
  if (subject) parts.push(`Subject: ${String(subject).slice(0, 60)}`);
  if (folder) parts.push(`Folder: ${String(folder).slice(0, 60)}`);
  parts.push(`Chunk: ${chunkIndex + 1}/${totalChunks}`);
  return parts.join(" | ") + "\n\n";
};

const prioritySplitters = [
  { pattern: /\n\s*\n/gm, label: "paragraph" },
  { pattern: /\n/gm, label: "line" },
  { pattern: /(?<=[.!?])\s+/gm, label: "sentence" },
  { pattern: /[,;]\s+/gm, label: "clause" },
  { pattern: /\s+/gm, label: "word" },
];

const splitAll = (text, regex) => {
  if (!text) return [""];
  const results = [];
  let lastIndex = 0;
  let match;
  const re = new RegExp(regex.source, regex.flags);
  while ((match = re.exec(text)) !== null) {
    const end = match.index + match[0].length;
    const segment = text.slice(lastIndex, end);
    if (segment) results.push(segment);
    lastIndex = end;
  }
  const tail = text.slice(lastIndex);
  if (tail) results.push(tail);
  if (!results.length) results.push(text);
  return results;
};

const recursiveSplit = (text, targetBytes, depth = 0) => {
  if (byteLength(text) <= targetBytes || depth >= prioritySplitters.length) {
    return [text].filter(Boolean);
  }
  const splitter = prioritySplitters[depth];
  const pieces = splitAll(text, splitter.pattern);
  if (pieces.length <= 1) {
    return recursiveSplit(text, targetBytes, depth + 1);
  }
  const out = [];
  let buffer = "";
  for (const piece of pieces) {
    const candidate = buffer + piece;
    if (byteLength(candidate) <= targetBytes) {
      buffer = candidate;
    } else {
      if (buffer) out.push(buffer);
      if (byteLength(piece) <= targetBytes) {
        buffer = piece;
      } else {
        const subSplits = recursiveSplit(piece, targetBytes, depth + 1);
        if (subSplits.length) {
          buffer = subSplits.pop();
          out.push(...subSplits);
        } else {
          buffer = "";
        }
      }
    }
  }
  if (buffer) out.push(buffer);
  return out;
};

export const CHUNK_STRATEGY = {
  MAX_BYTES: CHROMA_DOC_MAX_BYTES,
  TARGET_BYTES: DEFAULT_TARGET_BYTES,
  OVERLAP_BYTES: DEFAULT_OVERLAP_BYTES,
};

export const chunkNoteContent = ({
  noteId,
  title,
  subject,
  folder,
  content,
  summary,
  concepts = [],
  keywords = [],
  tags = [],
  targetBytes = DEFAULT_TARGET_BYTES,
  overlapBytes = DEFAULT_OVERLAP_BYTES,
}) => {
  const safeContent = String(content || summary || "");
  if (!safeContent.trim()) {
    return {
      chunks: [],
      strategy: CHUNK_STRATEGY,
      totalChunks: 0,
    };
  }

  const effectiveTarget = Math.min(targetBytes, CHUNK_CONTENT_MAX);
  const baseChunks = recursiveSplit(safeContent, effectiveTarget);

  const overlapped = [];
  for (let i = 0; i < baseChunks.length; i++) {
    const current = baseChunks[i];
    if (i === 0 || !overlapBytes) {
      overlapped.push(current);
      continue;
    }
    const prev = baseChunks[i - 1];
    const prevBytes = byteLength(prev);
    const overlapStart = Math.max(0, prevBytes - overlapBytes);
    const overlapSuffix = sliceBytes(prev, overlapStart, prevBytes);
    overlapped.push(overlapSuffix + current);
  }

  const totalChunks = overlapped.length;
  const headerTemplate = buildChunkHeader({
    title, subject, folder,
    chunkIndex: 0, totalChunks,
  });
  const headerBytesPerChunk = byteLength(headerTemplate) + 80;
  const maxContentPerChunk = CHUNK_CONTENT_MAX - headerBytesPerChunk;

  const finalChunks = [];
  for (let idx = 0; idx < overlapped.length; idx++) {
    let body = overlapped[idx];
    if (byteLength(body) > maxContentPerChunk) {
      body = sliceBytes(body, 0, maxContentPerChunk);
    }
    const header = buildChunkHeader({
      title, subject, folder,
      chunkIndex: idx, totalChunks,
    });
    const document = header + body;
    finalChunks.push({
      id: `${noteId}_c${idx}`,
      document,
      metadata: {
        noteId: String(noteId),
        chunkIndex: idx,
        totalChunks,
        title: String(title || "").slice(0, 140),
        subject: String(subject || "General").slice(0, 60),
        folder: String(folder || "Inbox").slice(0, 60),
        tags: (tags || []).slice(0, 10).join(","),
        concepts: (concepts || []).slice(0, 10).join(","),
        keywords: (keywords || []).slice(0, 10).join(","),
        hasSummary: Boolean(summary),
        sourceType: "student-note",
      },
    });
  }

  return {
    chunks: finalChunks,
    strategy: CHUNK_STRATEGY,
    totalChunks,
  };
};

export default chunkNoteContent;
