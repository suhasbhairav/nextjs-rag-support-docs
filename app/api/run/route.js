import { parseJsonRequest, validateRequestBody, toSafeError } from "@/lib/production-guardrails";
import OpenAI from "openai";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `
You are Next.js RAG Support Docs, a focused AI starter template.

Purpose:
A support documentation RAG chatbot for help centers, policy docs, and customer answers.

Rules:
- Return practical, structured output.
- Keep API keys and secrets server-side.
- State assumptions and production risks.
- Include implementation next steps.
- Do not claim external browsing or private data access.
`.trim();

function offlineResult(prompt) {
  return `
Next.js RAG Support Docs offline demo

User input:
${prompt}

Structured output:
1. Goal: Turn the request into a production-ready rag template workflow.
2. Data flow: Browser UI -> Next.js API route -> server-side OpenAI call -> structured JSON/text response.
3. Implementation notes:
   - Add OPENAI_API_KEY to .env.local.
   - Keep all provider calls in app/api/run/route.js.
   - Add persistence, auth, rate limits, and observability before production.
4. Suggested response shape:
   - Summary
   - Recommended workflow
   - Risk checks
   - Next actions
`.trim();
}

export async function POST(request) {
  const body = await parseJsonRequest(request);
  const guardrail = validateRequestBody(body);
  if (!guardrail.ok) {
    return Response.json({ error: guardrail.error }, { status: guardrail.status });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

  if (!prompt) {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({
      demo: true,
      model: "offline-fallback",
      output: offlineResult(prompt),
    });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.6",
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    return Response.json({
      demo: false,
      model: process.env.OPENAI_MODEL || "gpt-5.6",
      output: response.output_text,
    });
  } catch (error) {
    return Response.json(
      { error: toSafeError(error, "OpenAI request failed.") },
      { status: 500 },
    );
  }
}
