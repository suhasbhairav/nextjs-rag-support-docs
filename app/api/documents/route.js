import { listDocuments } from "@/lib/rag-store";

export async function GET() {
  return Response.json({ documents: listDocuments() });
}
