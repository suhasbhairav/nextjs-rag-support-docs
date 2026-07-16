import { deleteDocument } from "@/lib/rag-store";

export async function DELETE(_request, { params }) {
  const { documentId } = await params;
  const deleted = deleteDocument(documentId);

  return Response.json({ deleted });
}
