import { parseJsonRequest, validateRequestBody, toSafeError } from "@/lib/production-guardrails";
import { searchDocuments } from "@/lib/rag-store";

export async function POST(request) {
  const body = await parseJsonRequest(request);
  const guardrail = validateRequestBody(body);
  if (!guardrail.ok) {
    return Response.json({ error: guardrail.error }, { status: guardrail.status });
  }


  if (typeof body.query !== "string" || body.query.trim().length === 0) {
    return Response.json({ error: "query is required" }, { status: 400 });
  }

  try {
    const results = await searchDocuments(body.query, body.limit || 5);
    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: toSafeError(error) }, { status: 500 });
  }
}
