import { listDocuments } from "@/lib/rag-store";

export async function GET() {
  return Response.json({
    ok: true,
    mode: "in-memory-poc",
    embeddingModel: "text-embedding-3-small",
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    documents: listDocuments().length,
    timestamp: new Date().toISOString(),
  });
}
