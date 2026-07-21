import { validateUploadInput } from "@/lib/production-guardrails";
import { createRequire } from "node:module";
import { addDocument } from "@/lib/rag-store";

export const runtime = "nodejs";

const require = createRequire(import.meta.url);

async function extractFileText(file) {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf")) {
    const pdfParse = require("pdf-parse/lib/pdf-parse.js");
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }

  return buffer.toString("utf8");
}

export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const pastedText = formData.get("text");
  const title = formData.get("title");

  const uploadGuardrail = validateUploadInput({ file, text: pastedText, title });
  if (!uploadGuardrail.ok) {
    return Response.json({ error: uploadGuardrail.error }, { status: uploadGuardrail.status });
  }

  let content = uploadGuardrail.text;
  let sourceType = "paste";
  let documentTitle = uploadGuardrail.title;

  if (file && typeof file.arrayBuffer === "function") {
    content = await extractFileText(file);
    sourceType = file.type || "file";
    documentTitle = documentTitle || file.name;
  }

  const result = await addDocument({
    title: documentTitle || "Pasted article",
    content,
    sourceType,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({ document: result.document });
}
