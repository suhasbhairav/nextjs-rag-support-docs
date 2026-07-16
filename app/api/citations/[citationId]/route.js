import { getCitation } from "@/lib/rag-store";

export async function GET(_request, { params }) {
  const { citationId } = await params;
  const citation = getCitation(citationId);

  if (!citation) {
    return Response.json({ error: "Citation not found" }, { status: 404 });
  }

  return Response.json({ citation });
}
