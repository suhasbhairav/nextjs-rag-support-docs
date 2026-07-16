import { answerQuestion } from "@/lib/rag-store";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));

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
    return Response.json({ error: error.message }, { status: 500 });
  }
}
