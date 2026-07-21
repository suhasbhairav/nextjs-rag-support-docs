import { parseJsonRequest, validateRequestBody } from "@/lib/production-guardrails";
import { addDocument } from "@/lib/rag-store";

export async function POST(request) {
  const body = await parseJsonRequest(request);
  const guardrail = validateRequestBody(body);
  if (!guardrail.ok) {
    return Response.json({ error: guardrail.error }, { status: guardrail.status });
  }


  if (typeof body.content !== "string") {
    return Response.json({ error: "content is required" }, { status: 400 });
  }

  const result = await addDocument({
    title: body.title,
    content: body.content,
    sourceType: body.sourceType || "paste",
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({ document: result.document });
}
