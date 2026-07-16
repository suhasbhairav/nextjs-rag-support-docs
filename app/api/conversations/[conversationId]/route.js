import { deleteConversation, getConversation } from "@/lib/rag-store";

export async function GET(_request, { params }) {
  const { conversationId } = await params;
  const conversation = getConversation(conversationId);

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  return Response.json({ conversation });
}

export async function DELETE(_request, { params }) {
  const { conversationId } = await params;
  return Response.json({ deleted: deleteConversation(conversationId) });
}
