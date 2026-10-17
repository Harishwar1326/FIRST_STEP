import {
  CloudClient,
  Schema,
  VectorIndexConfig,
  SparseVectorIndexConfig,
  K,
} from "chromadb";
import {
  ChromaCloudQwenEmbeddingFunction,
  ChromaCloudQwenEmbeddingModel,
} from "@chroma-core/chroma-cloud-qwen";
import {
  ChromaCloudSpladeEmbeddingFunction,
  ChromaCloudSpladeEmbeddingModel,
} from "@chroma-core/chroma-cloud-splade";

let singletonClient = null;
const collectionCache = new Map();

const RESERVED_CHARS_PATTERN = /[^a-zA-Z0-9_\-]/g;

export const normalizeUserIdForCollection = (rawUserId) => {
  const safe = String(rawUserId || "guest")
    .replace(RESERVED_CHARS_PATTERN, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  return `notes_${safe || "user"}`;
};

const resolveChromaConfig = () => {
  const apiKey = process.env.CHROMA_API_KEY;
  const host = process.env.CHROMA_HOST || "api.trychroma.com";
  const tenant = process.env.CHROMA_TENANT;
  const database = process.env.CHROMA_DATABASE;
  const hasConfig = Boolean(
    apiKey && !String(apiKey).includes("<") && tenant && database,
  );
  return { apiKey, host, tenant, database, hasConfig };
};

export const isChromaConfigured = () => resolveChromaConfig().hasConfig;

export const buildNotesSchema = () => {
  const denseEf = new ChromaCloudQwenEmbeddingFunction({
    apiKeyEnvVar: "CHROMA_API_KEY",
    model: ChromaCloudQwenEmbeddingModel.QWEN3_EMBEDDING_0p6B,
    task: "retrieval.query",
  });

  const sparseEf = new ChromaCloudSpladeEmbeddingFunction({
    apiKeyEnvVar: "CHROMA_API_KEY",
    model: ChromaCloudSpladeEmbeddingModel.SPLADE_PP_EN_V1,
  });

  const schema = new Schema();

  schema.createIndex(
    new VectorIndexConfig({
      sourceKey: K.DOCUMENT,
      embeddingFunction: denseEf,
    }),
  );

  schema.createIndex(
    new SparseVectorIndexConfig({
      sourceKey: K.DOCUMENT,
      embeddingFunction: sparseEf,
    }),
    "sparse_embedding",
  );

  return { schema, denseEf, sparseEf };
};

export const getChromaClient = async () => {
  if (singletonClient) return singletonClient;
  const { apiKey, host, tenant, database, hasConfig } = resolveChromaConfig();
  if (!hasConfig) return null;
  try {
    const client = new CloudClient({
      apiKey,
      host,
      tenant,
      database,
    });
    singletonClient = client;
    return client;
  } catch (err) {
    console.warn(
      "[chroma] CloudClient init failed, continuing without Chroma:",
      err?.message || err,
    );
    return null;
  }
};

export const getOrCreateNotesCollectionForUser = async (userId) => {
  const name = normalizeUserIdForCollection(userId);
  if (collectionCache.has(name)) return collectionCache.get(name);
  const client = await getChromaClient();
  if (!client) return null;
  try {
    const { schema } = buildNotesSchema();
    const collection = await client.getOrCreateCollection({
      name,
      schema,
      metadata: {
        app: "firststep",
        feature: "smart-notes",
        owner_shard_key: String(userId),
        created_at: Date.now(),
      },
    });
    collectionCache.set(name, collection);
    return collection;
  } catch (err) {
    console.warn(
      `[chroma] getOrCreateCollection (${name}) failed:`,
      err?.message || err,
    );
    return null;
  }
};

export const clearChromaCollectionCache = () => collectionCache.clear();

export default getChromaClient;
