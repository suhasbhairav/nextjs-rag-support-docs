import { addDocument } from "@/lib/rag-store";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));

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
