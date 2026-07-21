import { parseJsonRequest, validateRequestBody, toSafeError } from "@/lib/production-guardrails";
import { answerQuestion } from "@/lib/rag-store";

export async function POST(request) {
  const body = await parseJsonRequest(request);
  const guardrail = validateRequestBody(body);
  if (!guardrail.ok) {
    return Response.json({ error: guardrail.error }, { status: guardrail.status });
  }


  if (typeof body.message !== "string" || body.message.trim().length === 0) {
    return Response.json({ error: "message is required" }, { status: 400 });
  }

  try {
    const response = await answerQuestion({
      conversationId: body.conversationId,
      question: body.message,
    });

    return Response.json(response);
  } catch (error) {
    return Response.json({ error: toSafeError(error) }, { status: 500 });
  }
}
