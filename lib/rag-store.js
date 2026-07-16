const MAX_DOCUMENT_CHARS = 120_000;
const CHUNK_TARGET_CHARS = 1_800;
const CHUNK_OVERLAP_SENTENCES = 2;
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_BATCH_SIZE = 64;

const globalState = globalThis.__ragChatbotPocStore ?? {
  documents: new Map(),
  chunks: new Map(),
  conversations: new Map(),
  citations: new Map(),
};

globalThis.__ragChatbotPocStore = globalState;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "how",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "this",
  "to",
  "was",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
]);

export function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

export function normalizeText(text) {
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/-\n(?=\w)/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function splitSentences(text) {
  const matches = normalizeText(text).match(/[^.!?\n]+(?:[.!?]+|\n|$)/g);
  return (matches ?? [text]).map((sentence) => sentence.trim()).filter(Boolean);
}

function tokenize(text) {
  return String(text ?? "")
    .toLowerCase()
    .match(/[a-z0-9][a-z0-9'-]{1,}/g)
    ?.filter((token) => !STOP_WORDS.has(token)) ?? [];
}

async function createEmbeddings(inputs) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to create embeddings.");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: inputs,
      encoding_format: "float",
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload.error?.message || `OpenAI embeddings request failed with ${response.status}`,
    );
  }

  return payload.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

async function embedChunks(chunks) {
  for (let index = 0; index < chunks.length; index += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(index, index + EMBEDDING_BATCH_SIZE);
    const embeddings = await createEmbeddings(batch.map((chunk) => chunk.text));

    embeddings.forEach((embedding, batchIndex) => {
      batch[batchIndex].embedding = embedding;
    });
  }
}

function cosineSimilarity(left, right) {
  if (!left || !right || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function makeChunks(documentId, title, content) {
  const sentences = splitSentences(content);
  const chunks = [];
  let index = 0;
  let page = 1;

  while (index < sentences.length) {
    const start = index;
    let text = "";

    while (index < sentences.length && text.length < CHUNK_TARGET_CHARS) {
      text = `${text} ${sentences[index]}`.trim();
      index += 1;
    }

    const chunkText = text.trim();
    if (chunkText) {
      chunks.push({
        id: createId("chk"),
        documentId,
        title,
        index: chunks.length,
        page,
        text: chunkText,
        tokens: tokenize(chunkText),
      });
      page += Math.max(1, Math.floor(chunkText.length / 2_800));
    }

    if (index < sentences.length) {
      index = Math.max(start + 1, index - CHUNK_OVERLAP_SENTENCES);
    }
  }

  return chunks;
}

export async function addDocument({ title, content, sourceType = "paste" }) {
  const cleanTitle = String(title || "Untitled document").slice(0, 140);
  const cleanContent = normalizeText(content).slice(0, MAX_DOCUMENT_CHARS);

  if (cleanContent.length < 40) {
    return {
      ok: false,
      error: "Add at least a few sentences of extractable text before processing.",
    };
  }

  const documentId = createId("doc");
  const chunks = makeChunks(documentId, cleanTitle, cleanContent);

  if (chunks.length === 0) {
    return {
      ok: false,
      error: "No searchable text could be extracted from this document.",
    };
  }

  try {
    await embedChunks(chunks);
  } catch (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  const document = {
    id: documentId,
    title: cleanTitle,
    sourceType,
    status: "ready",
    embeddingModel: EMBEDDING_MODEL,
    characters: cleanContent.length,
    chunkCount: chunks.length,
    createdAt: new Date().toISOString(),
  };

  globalState.documents.set(documentId, document);
  for (const chunk of chunks) {
    globalState.chunks.set(chunk.id, chunk);
  }

  return { ok: true, document, chunks };
}

export function listDocuments() {
  return Array.from(globalState.documents.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function deleteDocument(documentId) {
  const existed = globalState.documents.delete(documentId);

  for (const [chunkId, chunk] of globalState.chunks) {
    if (chunk.documentId === documentId) {
      globalState.chunks.delete(chunkId);
    }
  }

  for (const [citationId, citation] of globalState.citations) {
    if (citation.documentId === documentId) {
      globalState.citations.delete(citationId);
    }
  }

  return existed;
}

export async function searchDocuments(query, limit = 5) {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return [];
  }

  const querySet = new Set(queryTokens);
  const phrase = normalizeText(query).toLowerCase();
  const [queryEmbedding] = await createEmbeddings([phrase]);

  return Array.from(globalState.chunks.values())
    .map((chunk) => {
      const tokenHits = chunk.tokens.filter((token) => querySet.has(token));
      const uniqueHits = new Set(tokenHits).size;
      const density = tokenHits.length / Math.max(1, chunk.tokens.length);
      const phraseBonus = phrase.length > 8 && chunk.text.toLowerCase().includes(phrase) ? 2 : 0;
      const keywordScore = uniqueHits * 2 + density * 8 + phraseBonus;
      const semanticScore = cosineSimilarity(queryEmbedding, chunk.embedding);
      const score = semanticScore * 10 + keywordScore;

      return {
        id: chunk.id,
        documentId: chunk.documentId,
        title: chunk.title,
        page: chunk.page,
        text: chunk.text,
        score,
        semanticScore,
        keywordScore,
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function pickEvidenceSentences(question, results) {
  const questionTokens = new Set(tokenize(question));

  return results
    .flatMap((result) =>
      splitSentences(result.text).map((sentence) => {
        const tokens = tokenize(sentence);
        const hitCount = tokens.filter((token) => questionTokens.has(token)).length;
        return { result, sentence, hitCount };
      }),
    )
    .filter((candidate) => candidate.hitCount > 0)
    .sort((a, b) => b.hitCount - a.hitCount)
    .slice(0, 4);
}

export async function answerQuestion({ conversationId, question }) {
  const cleanQuestion = normalizeText(question);
  const id = conversationId || createId("conv");
  const results = await searchDocuments(cleanQuestion, 6);
  const evidence = pickEvidenceSentences(cleanQuestion, results);

  let answer;
  const citations = [];

  if (evidence.length === 0) {
    answer =
      "I do not have enough evidence in the uploaded documents to answer that reliably.";
  } else {
    answer = evidence
      .map((item, index) => {
        const citationId = createId("cit");
        const citation = {
          id: citationId,
          documentId: item.result.documentId,
          chunkId: item.result.id,
          title: item.result.title,
          page: item.result.page,
          quote: item.sentence,
        };

        globalState.citations.set(citationId, citation);
        citations.push(citation);
        return `${item.sentence} [${index + 1}]`;
      })
      .join(" ");
  }

  const conversation = globalState.conversations.get(id) ?? {
    id,
    createdAt: new Date().toISOString(),
    messages: [],
  };

  conversation.messages.push({
    id: createId("msg"),
    role: "user",
    content: cleanQuestion,
    createdAt: new Date().toISOString(),
  });
  conversation.messages.push({
    id: createId("msg"),
    role: "assistant",
    content: answer,
    citations,
    createdAt: new Date().toISOString(),
  });

  globalState.conversations.set(id, conversation);

  return {
    conversationId: id,
    answer,
    citations,
    results,
    insufficientEvidence: evidence.length === 0,
  };
}

export function getConversation(conversationId) {
  return globalState.conversations.get(conversationId) ?? null;
}

export function deleteConversation(conversationId) {
  return globalState.conversations.delete(conversationId);
}

export function getCitation(citationId) {
  return globalState.citations.get(citationId) ?? null;
}
