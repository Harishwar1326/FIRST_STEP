import { callGeminiJson } from "../utils/geminiClient.js";
import { callOpenAIJson } from "../utils/openaiClient.js";
import { callOllamaJson } from "../utils/ollamaClient.js";

const conceptMapPrompt = [
  "You are an educational knowledge graph generator.",
  "The user supplies one concept. Build a compact, accurate map that explains the concept through entities and relationships.",
  "Use concise definitions grounded in reliable general knowledge. Keep entities relevant and avoid unsupported claims.",
  "Return only valid JSON in this shape:",
  '{ "mainConcept": "...", "mainDefinition": "...", "entities": [{ "name": "...", "type": "...", "definition": "...", "examples": ["..."] }], "relationships": [{ "source": "entity name", "target": "entity name", "relationship": "short verb phrase", "explanation": "why these are connected" }] }',
  "Include 6 to 10 related entities plus the main concept.",
  "Include at least one relationship for each related entity so the graph stays connected.",
  "Definitions should be one or two sentences. Examples should be specific and short.",
].join("\n");

const entityDetailsPrompt = [
  "You are a clear, accurate study tutor. Explain the selected entity in the context of the student's concept map.",
  "Return only valid JSON with this shape: { \"definition\": \"...\", \"whyRelated\": \"...\", \"examples\": [\"...\"], \"keyFacts\": [\"...\"] }.",
  "Give a direct definition, explain its relationship to the map's main concept and connected entities, and include up to three useful examples and key facts.",
  "Keep language student-friendly. Do not invent a connection when the supplied context does not support one; state uncertainty plainly.",
].join("\n");

const ollamaFallbackEnabled = () =>
  !['false', '0', 'off'].includes(String(process.env.OLLAMA_FALLBACK_ENABLED || '').toLowerCase());

const cleanText = (value, limit = 500) => String(value || "").trim().slice(0, limit);
const normalizeKey = (value) => cleanText(value).toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const normalizeId = (value) => normalizeKey(value).replace(/\s+/g, "-").slice(0, 80) || "entity";

const uniqueStrings = (values, limit = 10) => {
  const seen = new Set();
  return (Array.isArray(values) ? values : []).map((value) => cleanText(value, 180)).filter((value) => {
    const key = normalizeKey(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
};

const makeFallbackMap = (concept) => {
  const angles = [
    ["Core principles", "The foundational ideas that define this topic."],
    ["Key components", "The parts or terms needed to explain this topic."],
    ["How it works", "The process or mechanisms associated with this topic."],
    ["Applications", "Contexts where this topic can be used."],
    ["Examples", "Concrete cases that can help explain this topic."],
    ["Limitations", "Constraints and questions to consider when studying this topic."],
  ];
  const nodes = [{
    id: normalizeId(concept),
    label: concept,
    type: "Main concept",
    definition: `The topic you asked to explore: ${concept}.`,
    examples: [],
  }, ...angles.map(([label, definition]) => ({
    id: normalizeId(`${concept}-${label}`),
    label,
    type: "Study area",
    definition: `${definition} Explore this area in the context of ${concept}.`,
    examples: [],
  }))];
  const edges = nodes.slice(1).map((node) => ({
    id: `${nodes[0].id}-${node.id}-includes`,
    source: nodes[0].id,
    target: node.id,
    label: "explore through",
    explanation: `This is a useful study angle for ${concept}.`,
  }));
  return {
    mainConcept: concept,
    mainDefinition: `The topic you asked to explore: ${concept}.`,
    relatedConcepts: nodes.slice(1).map((node) => node.label),
    nodes,
    edges,
    entityCount: nodes.length,
    relationshipCount: edges.length,
    source: "local-fallback",
    processingWarning: "AI concept generation was unavailable. This starter map uses general study areas; its labels are not topic-specific facts.",
  };
};

const normalizeGraph = (result, requestedConcept, source = "gemini") => {
  if (!result || typeof result !== "object") return null;
  const mainConcept = cleanText(result.mainConcept, 120) || requestedConcept;
  const mainDefinition = cleanText(result.mainDefinition || result.definition, 800)
    || `${mainConcept} is the central topic in this concept map. Explore the connected entities to see its key ideas and relationships.`;
  const rawEntities = Array.isArray(result.entities) ? result.entities : [];
  const nodes = [];
  const nodeByName = new Map();
  const addNode = (entity, isMain = false) => {
    const label = cleanText(isMain ? mainConcept : entity?.name || entity?.label, 120);
    const key = normalizeKey(label);
    if (!key) return null;
    if (nodeByName.has(key)) return nodeByName.get(key);
    const node = {
      id: normalizeId(label),
      label,
      type: isMain ? "Main concept" : cleanText(entity?.type, 80) || "Related concept",
      definition: cleanText(isMain ? mainDefinition : entity?.definition || entity?.description, 800)
        || `${label} is connected to ${mainConcept} in this concept map. Use the relationship links to see how it relates to the main topic.`,
      examples: uniqueStrings(entity?.examples, 4),
    };
    nodes.push(node);
    nodeByName.set(key, node);
    nodeByName.set(normalizeKey(node.id), node);
    return node;
  };

  const root = addNode({}, true);
  rawEntities.slice(0, 14).forEach((entity) => addNode(entity));
  if (!root || nodes.length < 2) return null;

  const edges = [];
  const edgeKeys = new Set();
  const nodeFor = (value) => nodeByName.get(normalizeKey(value));
  const addEdge = (sourceNode, targetNode, label, explanation = "") => {
    if (!sourceNode || !targetNode || sourceNode.id === targetNode.id) return;
    const edgeKey = `${sourceNode.id}|${targetNode.id}|${normalizeKey(label)}`;
    if (edgeKeys.has(edgeKey)) return;
    edgeKeys.add(edgeKey);
    edges.push({
      id: edgeKey.replace(/[^a-z0-9|-]/gi, "-").slice(0, 180),
      source: sourceNode.id,
      target: targetNode.id,
      label: cleanText(label, 100) || "related to",
      explanation: cleanText(explanation, 500),
    });
  };

  (Array.isArray(result.relationships) ? result.relationships : []).slice(0, 30).forEach((relationship) => {
    const source = nodeFor(relationship?.source);
    const target = nodeFor(relationship?.target);
    addEdge(source, target, relationship?.relationship || relationship?.label, relationship?.explanation);
  });

  // Keep every generated entity reachable even when the model omits a link.
  nodes.slice(1).forEach((node) => {
    if (!edges.some((edge) => edge.source === node.id || edge.target === node.id)) {
      addEdge(root, node, "related to", "Related to the main concept in this study map.");
    }
  });

  return {
    mainConcept,
    mainDefinition,
    relatedConcepts: nodes.slice(1).map((node) => node.label),
    nodes,
    edges,
    entityCount: nodes.length,
    relationshipCount: edges.length,
    source,
    processingWarning: source === "ollama" ? "Remote AI was unavailable; this map was generated by the local Ollama model." : "",
  };
};

export const conceptMapService = {
  async generate(concept) {
    const requestedConcept = cleanText(concept, 160);
    if (!requestedConcept) {
      const error = new Error("Enter a concept to generate its relationship map.");
      error.statusCode = 400;
      throw error;
    }

    const promptInput = {
      systemPrompt: conceptMapPrompt,
      userPayload: { concept: requestedConcept },
      maxTokens: 1800,
      temperature: 0.15,
    };
    try {
      const generated = await callGeminiJson(promptInput);
      const graph = normalizeGraph(generated, requestedConcept, "gemini");
      if (graph) return graph;
    } catch (error) {
      console.warn("Gemini concept map generation failed; trying local Ollama:", error.message);
    }

    if (ollamaFallbackEnabled()) {
      try {
        const generated = await callOllamaJson(promptInput);
        const graph = normalizeGraph(generated, requestedConcept, "ollama");
        if (graph) return graph;
      } catch (error) {
        console.warn("Ollama concept map generation failed; using the labeled starter map:", error.code || error.message);
      }
    }

    return makeFallbackMap(requestedConcept);
  },

  async explainEntity({ concept, entity, type, definition, connectedEntities = [] }) {
    const mainConcept = cleanText(concept, 160);
    const entityName = cleanText(entity, 160);
    if (!mainConcept || !entityName) {
      const error = new Error("A map concept and selected entity are required.");
      error.statusCode = 400;
      throw error;
    }
    const connections = (Array.isArray(connectedEntities) ? connectedEntities : []).slice(0, 8).map((item) => ({
      name: cleanText(item?.name, 120),
      relationship: cleanText(item?.relationship, 120),
      explanation: cleanText(item?.explanation, 250),
    }));
    const localFallback = {
      entity: entityName,
      type: cleanText(type, 80) || "Related concept",
      definition: cleanText(definition, 800) || `${entityName} is connected to ${mainConcept} in this concept map.`,
      whyRelated: connections.map((item) => item.explanation).filter(Boolean).join(" ")
        || `${entityName} is shown as a related idea within ${mainConcept}.`,
      examples: [],
      keyFacts: [],
      source: "concept-map-context",
      warning: "",
    };
    const extractionInput = {
      mainConcept,
      entity: entityName,
      type,
      existingDefinition: definition,
      connectedEntities: connections,
    };
    const normalizeDetails = (result, source, warning = "") => ({
      ...localFallback,
      definition: cleanText(result.definition, 1000) || localFallback.definition,
      whyRelated: cleanText(result.whyRelated, 800) || localFallback.whyRelated,
      examples: uniqueStrings(result.examples, 3),
      keyFacts: uniqueStrings(result.keyFacts, 4),
      source,
      warning,
    });

    let openAIError;
    try {
      const result = await callOpenAIJson({
        systemPrompt: entityDetailsPrompt,
        userPayload: extractionInput,
        maxTokens: 800,
        temperature: 0.2,
      });
      return normalizeDetails(result, "openai");
    } catch (error) {
      openAIError = error;
      console.warn("OpenAI entity extraction unavailable; trying local Ollama fallback:", error.code || "OPENAI_REQUEST_FAILED");
    }

    if (ollamaFallbackEnabled()) {
      try {
        const result = await callOllamaJson({
          systemPrompt: entityDetailsPrompt,
          userPayload: extractionInput,
          maxTokens: 800,
          temperature: 0.2,
        });
        const openAICode = String(openAIError?.code || "").toLowerCase();
        const quotaFallback = openAICode.includes("quota") || openAICode.includes("credit_balance");
        return normalizeDetails(
          result,
          "ollama-fallback",
          quotaFallback
            ? "OpenAI quota is unavailable. These entity details were generated by the local Ollama model."
            : "OpenAI was unavailable. These entity details were generated by the local Ollama model.",
        );
      } catch (ollamaError) {
        console.warn("Ollama entity fallback failed; returning concept-map context:", ollamaError.code || "OLLAMA_REQUEST_FAILED");
      }
    }
    localFallback.warning = "OpenAI and the local Ollama model could not enrich this entity. Showing the definition and relationships from the concept map.";
    return localFallback;
  },
};

export default conceptMapService;
