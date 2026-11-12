import { forestRepository } from "../repositories/forest.repository.js";
import { aiServiceClient } from "../utils/aiServiceClient.js";
import { notesRepository } from "../repositories/notes.repository.js";

const getProcessedNotes = (userId) => notesRepository.findByUserId(userId, {
  status: "processed",
  noteType: "document",
});

const conceptsFromNotes = (notes) => {
  const seen = new Set();
  return notes.flatMap((note) => (note.concepts || []).map((concept) => ({
    name: String(concept || "").trim(),
    category: note.subject || "General",
    noteTitle: note.title || "Study note",
  }))).filter((item) => {
    const key = item.name.toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 40);
};

const makeGraphData = (notes) => {
  const concepts = conceptsFromNotes(notes);
  const nodes = concepts.map((item, index) => ({
    id: `concept-${index + 1}`,
    name: item.name,
    category: item.category,
    connections: 0,
    difficulty: "unknown",
  }));
  const edges = [];
  notes.forEach((note) => {
    const names = (note.concepts || []).map((name) => String(name).toLocaleLowerCase());
    for (let index = 1; index < names.length; index += 1) {
      const sourceIndex = concepts.findIndex((item) => item.name.toLocaleLowerCase() === names[index - 1]);
      const targetIndex = concepts.findIndex((item) => item.name.toLocaleLowerCase() === names[index]);
      if (sourceIndex >= 0 && targetIndex >= 0 && sourceIndex !== targetIndex) {
        const exists = edges.some((edge) => edge.source === nodes[sourceIndex].id && edge.target === nodes[targetIndex].id);
        if (!exists) edges.push({ source: nodes[sourceIndex].id, target: nodes[targetIndex].id, type: "in same note", strength: 1 });
      }
    }
  });
  edges.forEach(({ source, target }) => {
    const from = nodes.find((node) => node.id === source);
    const to = nodes.find((node) => node.id === target);
    if (from) from.connections += 1;
    if (to) to.connections += 1;
  });
  return { nodes, edges };
};

const localLearningPath = (notes) => ({
  steps: conceptsFromNotes(notes).map((item, index) => ({
    order: index + 1,
    concept: item.name,
    status: index === 0 ? "current" : "upcoming",
    prerequisites: index ? [conceptsFromNotes(notes)[index - 1].name] : [],
  })),
});

const tryAI = async (path, payload) => {
  try {
    return (await aiServiceClient.post(path, payload)).data;
  } catch (error) {
    console.warn(`AI service unavailable for ${path}; using saved study data.`, error.code || error.response?.status || error.message);
    return null;
  }
};

export const forestService = {
  async getKnowledgeGraph(userId) {
    let graph = await forestRepository.findGraphByUserId(userId);
    if (!graph) {
      const aiData = await tryAI("/forest/graph/generate", { userId });
      const data = aiData?.nodes ? aiData : makeGraphData(await getProcessedNotes(userId));
      graph = await forestRepository.updateGraph(userId, {
        nodes: data.nodes || [],
        edges: data.edges || [],
      });
    }
    return { graphId: graph._id, nodes: graph.nodes, edges: graph.edges, lastUpdated: graph.updatedAt };
  },

  async getConceptDetails(conceptId, userId) {
    const aiData = await tryAI("/forest/concept/details", { userId, conceptId });
    if (aiData) return aiData;
    const graph = await forestRepository.findGraphByUserId(userId);
    const concept = graph?.nodes?.find((node) => node.id === conceptId || node.name === conceptId);
    return concept ? { concept, details: `Review ${concept.name} using the linked material in your notes.` } : { conceptId, details: "No saved study data is available for this concept yet." };
  },

  async getLearningPath(userId) {
    let path = await forestRepository.findLearningPathByUserId(userId);
    if (!path) {
      const aiData = await tryAI("/forest/path/generate", { userId });
      const data = aiData?.steps ? aiData : localLearningPath(await getProcessedNotes(userId));
      path = await forestRepository.updateLearningPath(userId, { steps: data.steps || [], currentStep: 1, progress: 0 });
      return { pathId: path._id, steps: path.steps, currentStep: path.currentStep, progress: path.progress || 0, estimatedDuration: data.estimatedDuration };
    }
    return { pathId: path._id, steps: path.steps, currentStep: path.currentStep, progress: path.progress || 0 };
  },

  async detectGaps(userId) {
    const aiData = await tryAI("/forest/gaps/detect", { userId });
    const notes = aiData ? [] : await getProcessedNotes(userId);
    const gaps = aiData?.gaps || [];
    const criticalGaps = aiData?.criticalGaps || [];
    const suggestedActions = aiData?.suggestedActions || (notes.length
      ? ["Take a quiz on a saved note to identify concepts that need review."]
      : ["Process a study note or complete a quiz to start identifying learning gaps."]);
    await forestRepository.updateGraph(userId, { gaps });
    return { gaps, criticalGaps, suggestedActions };
  },

  async getConceptMap(userId, concept) {
    const notes = await getProcessedNotes(userId);
    const sourceText = notes.map((note) => `${note.title || ""}\n${note.content || note.summary || ""}`).join("\n\n").slice(0, 100000);
    const query = String(concept || "").trim();
    const aiData = await tryAI("/forest/concept-map", { userId, concept: query, sourceText });
    if (aiData) return aiData;
    const graph = makeGraphData(notes);
    const matched = graph.nodes.filter((node) => !query || node.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
    const ids = new Set(matched.map((node) => node.id));
    return { concept: query, nodes: matched, edges: graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)), source: "saved-notes" };
  },
};
