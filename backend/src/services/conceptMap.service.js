import { callGeminiJson } from "../utils/geminiClient.js";

const expansionPrompt = [
  "You are an educational concept expansion engine.",
  "Given a student concept, identify the main concept and 8 to 12 closely related concepts that help a student understand the topic.",
  "Return only valid JSON with this exact shape:",
  '{ "mainConcept": "string", "relatedConcepts": ["string"] }',
  "Do not include explanations, markdown, duplicates, or unrelated concepts.",
].join("\n");

const entityPrompt = [
  "You are an educational knowledge graph extraction engine.",
  "Given a main concept and related concepts, extract useful entities and meaningful relationships between them.",
  "Avoid duplicates and irrelevant entities. Keep the graph focused and educational.",
  "Return only valid JSON with this exact shape:",
  '{ "entities": [{ "id": "string", "name": "string", "type": "string" }], "relationships": [{ "source": "string", "target": "string", "relationship": "string" }] }',
].join("\n");

const cleanText = (value) => String(value || "").trim();

const normalizeId = (value) =>
  cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const uniqueById = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    if (!item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

export const conceptMapService = {
  async generate(concept) {
    const requestedConcept = cleanText(concept);
    if (!requestedConcept) {
      const error = new Error("A concept is required");
      error.statusCode = 400;
      throw error;
    }

    const expansion = await callGeminiJson({
      systemPrompt: expansionPrompt,
      userPayload: { concept: requestedConcept },
      maxTokens: 500,
      temperature: 0.2,
    });

    const mainConcept = cleanText(expansion?.mainConcept);
    const relatedConcepts = Array.isArray(expansion?.relatedConcepts)
      ? expansion.relatedConcepts.map(cleanText).filter(Boolean).slice(0, 12)
      : [];
    if (!mainConcept || !relatedConcepts.length) {
      throw new Error("Concept expansion returned no usable concepts");
    }

    const entities = await callGeminiJson({
      systemPrompt: entityPrompt,
      userPayload: { mainConcept, relatedConcepts },
      apiKey: process.env.ENTITY_AI_API_KEY || undefined,
      maxTokens: 900,
      temperature: 0.15,
    });

    if (
      !Array.isArray(entities?.entities) ||
      !Array.isArray(entities?.relationships)
    ) {
      throw new Error("Entity extraction returned an invalid graph");
    }

    const nodes = uniqueById(
      entities.entities
        .map((entity) => {
          const label = cleanText(entity.name);
          return {
            id: normalizeId(entity.id || label),
            label,
            type: cleanText(entity.type) || "Concept",
          };
        })
        .filter((node) => node.id && node.label),
    );

    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = [];
    const edgeIds = new Set();
    for (const relationship of entities.relationships) {
      const source = normalizeId(relationship.source);
      const target = normalizeId(relationship.target);
      const label = cleanText(relationship.relationship) || "related_to";
      const id = `${source}-${target}-${normalizeId(label)}`;
      if (
        !nodeIds.has(source) ||
        !nodeIds.has(target) ||
        source === target ||
        edgeIds.has(id)
      )
        continue;
      edgeIds.add(id);
      edges.push({ id, source, target, label });
    }

    if (!nodes.length || !edges.length)
      throw new Error("Entity extraction returned an empty graph");

    return {
      mainConcept,
      relatedConcepts,
      nodes,
      edges,
    };
  },
};

export default conceptMapService;
