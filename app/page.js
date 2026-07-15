"use client";

import { useMemo, useState } from "react";

const starterPrompts = [
  "A support documentation RAG chatbot for help centers, policy docs, and customer answers.",
  "Create a production-ready workflow with risks, data flow, and owner handoffs.",
  "Generate a sample user journey and API contract for this starter.",
  "Give me a launch checklist and extension roadmap for this template."
];
const metrics = [
  "Server route",
  "Responsive UI",
  "Env setup"
];
const steps = [
  "Capture input",
  "Run server route",
  "Return structured output"
];
const chips = [
  "Retrieval workflow",
  "Next.js",
  "OpenAI",
  "Mobile ready"
];
const endpoint = "/api/run";

export default function Home() {
  const [prompt, setPrompt] = useState(starterPrompts[0]);
  const [result, setResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState("");

  const status = useMemo(() => {
    if (isRunning) return "Running";
    if (result?.demo) return "Local response";
    if (result) return "Completed";
    return "Ready";
  }, [isRunning, result]);

  async function submit(event) {
    event.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isRunning) return;

    setIsRunning(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: cleanPrompt }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Template run failed.");
      setResult(data);
    } catch (runError) {
      setError(runError.message);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbf7ef] text-[#16130f]">
      <section className="mx-auto grid min-h-screen w-full max-w-[1440px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
        <div className="flex flex-col justify-between gap-8 py-6">
          <div>
            <span className="inline-flex px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-white" style={{ backgroundColor: "#e07a1f" }}>Retrieval workflow</span>
            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-none sm:text-7xl">Next.js RAG Support Docs</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 opacity-70">A support documentation RAG chatbot for help centers, policy docs, and customer answers.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">{metrics.map((item) => <div className="rounded-lg border bg-white border-[#2b2116]/10 p-4" key={item}><p className="text-xs font-black uppercase opacity-45">Signal</p><p className="mt-2 font-black">{item}</p></div>)}</div>
        </div>
        <div className="rounded-lg border bg-white border-[#2b2116]/10 my-auto p-4 sm:p-6">
          <form className="space-y-3" onSubmit={submit}>
              <textarea
                className="min-h-44 w-full resize-y border border-current/10 bg-white/70 px-4 py-3 text-sm leading-7 outline-none placeholder:opacity-40 focus:border-current/30"
                onChange={(event) => setPrompt(event.target.value)}
                value={prompt}
              />
              <button
                className="min-h-12 w-full px-5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40 bg-[#16130f] text-white hover:bg-[#2d251c]"
                disabled={isRunning || !prompt.trim()}
                type="submit"
              >
                {isRunning ? "Running..." : "Ask documents"}
              </button>
            </form>
          <div className="mt-4 space-y-3">{error ? <div className="border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-100">{error}</div> : null}
            {result ? (
              <article className="border border-current/10 bg-white/60 p-4 text-sm leading-7 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>Result</strong>
                  <span className="border border-current/10 px-2 py-1 text-xs opacity-60">{result.model || "local"}</span>
                </div>
                <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap bg-black/5 p-4 text-sm leading-7">
                  {result.output || result.clientSecret || JSON.stringify(result, null, 2)}
                </pre>
              </article>
            ) : null}</div>
        </div>
      </section>
    </main>
  );
}
