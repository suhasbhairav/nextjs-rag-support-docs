import { searchDocuments } from "@/lib/rag-store";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));

  if (typeof body.query !== "string" || body.query.trim().length === 0) {
    return Response.json({ error: "query is required" }, { status: 400 });
  }

  try {
    const results = await searchDocuments(body.query, body.limit || 5);
    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
