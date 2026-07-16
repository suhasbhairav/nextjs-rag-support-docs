"use client";

import { useEffect, useMemo, useState } from "react";

const sampleDocument = `Support Center Runbook

Acme Cloud keeps customer data in the eu-central-1 region by default. Enterprise customers can request a United States region during onboarding.

Password resets expire after 30 minutes. A user who misses that window must request a new reset link from the sign-in page.

The standard support plan answers tickets within two business days. The premium support plan answers critical tickets within four hours, including weekends.

Invoices are generated on the first calendar day of each month. Billing administrators can download invoices from Workspace Settings under the Billing tab.`;

const quickPrompts = [
  "Draft a customer-facing answer about premium support response times.",
  "Where can billing administrators download invoices?",
  "What should an agent say if a password reset link expired?",
  "Summarize region options for enterprise customers.",
];

export default function Home() {
  const [documents, setDocuments] = useState([]);
  const [title, setTitle] = useState("Support Center Runbook");
  const [text, setText] = useState(sampleDocument);
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState(quickPrompts[0]);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState("");

  const hasDocuments = documents.length > 0;
  const lastAssistant = useMemo(
    () => [...messages].reverse().find((item) => item.role === "assistant"),
    [messages],
  );

  async function loadDocuments() {
    const response = await fetch("/api/documents");
    const data = await response.json();
    setDocuments(data.documents ?? []);
  }

  useEffect(() => {
    let isMounted = true;

    fetch("/api/documents")
      .then((response) => response.json())
      .then((data) => {
        if (isMounted) {
          setDocuments(data.documents ?? []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setDocuments([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function uploadDocument(event) {
    event.preventDefault();
    setError("");
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("title", title);

      if (file) {
        formData.append("file", file);
      } else {
        formData.append("text", text);
      }

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Document upload failed");
      }

      setFile(null);
      await loadDocuments();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
    }
  }

  async function deleteDocument(documentId) {
    await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
    await loadDocuments();
  }

  async function askQuestion(event) {
    event.preventDefault();
    const cleanMessage = message.trim();

    if (!cleanMessage) {
      return;
    }

    setError("");
    setIsAsking(true);
    setSelectedCitation(null);
    setMessages((current) => [
      ...current,
      { role: "user", content: cleanMessage, id: `local-${Date.now()}` },
    ]);
    setMessage("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: cleanMessage }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Chat failed");
      }

      setConversationId(data.conversationId);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.answer,
          citations: data.citations ?? [],
          results: data.results ?? [],
          id: `assistant-${Date.now()}`,
        },
      ]);
    } catch (chatError) {
      setError(chatError.message);
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f8fb] text-[#182026]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-2 border-b border-[#d8d6cc] pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#356859]">
              Support Docs RAG
            </p>
            <h1 className="text-3xl font-semibold tracking-normal text-[#182026]">
              Answer customer questions from indexed help docs
            </h1>
            <p className="mt-2 text-sm text-[#64706b]">
              Created by{" "}
              <a
                className="font-semibold text-[#356859] underline-offset-4 hover:underline"
                href="https://suhasbhairav.com"
                rel="noopener noreferrer"
                target="_blank"
              >
                Suhas Bhairav
              </a>
            </p>
          </div>
          <div className="rounded-md border border-[#d8d6cc] bg-white px-3 py-2 text-sm">
            text-embedding-3-small · {documents.length} document
            {documents.length === 1 ? "" : "s"} indexed
          </div>
        </header>

        {error ? (
          <div className="rounded-md border border-[#e0a39a] bg-[#fff4f1] px-4 py-3 text-sm text-[#8a2f25]">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-4">
            <section className="rounded-md border border-[#d8d6cc] bg-white p-4">
              <h2 className="text-lg font-semibold">Add support article</h2>
              <form className="mt-4 space-y-3" onSubmit={uploadDocument}>
                <label className="block text-sm font-medium">
                  Title
                  <input
                    className="mt-1 w-full rounded-md border border-[#c9c7bc] px-3 py-2 outline-none focus:border-[#356859]"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>

                <label className="block text-sm font-medium">
                  Upload PDF, text, Markdown, or CSV
                  <input
                    className="mt-1 w-full rounded-md border border-[#c9c7bc] bg-white px-3 py-2 text-sm"
                    type="file"
                    accept=".txt,.md,.markdown,.csv,.pdf,.docx,text/plain,text/markdown,application/pdf"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  />
                </label>

                <label className="block text-sm font-medium">
                  Or paste help article text
                  <textarea
                    className="mt-1 min-h-48 w-full resize-y rounded-md border border-[#c9c7bc] px-3 py-2 text-sm leading-6 outline-none focus:border-[#356859]"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                  />
                </label>

                <button
                  className="w-full rounded-md bg-[#356859] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2a5146] disabled:cursor-not-allowed disabled:bg-[#9aa8a2]"
                  disabled={isUploading}
                  type="submit"
                >
                  {isUploading ? "Indexing article..." : "Index support article"}
                </button>
              </form>
            </section>

            <section className="rounded-md border border-[#d8d6cc] bg-white p-4">
              <h2 className="text-lg font-semibold">Help center sources</h2>
              <div className="mt-3 space-y-2">
                {documents.length === 0 ? (
                  <p className="text-sm leading-6 text-[#64706b]">
                    Index help docs, FAQs, runbooks, or policies to start answering.
                  </p>
                ) : (
                  documents.map((document) => (
                    <div
                      className="rounded-md border border-[#e6e3d8] bg-[#fbfbf7] p-3"
                      key={document.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{document.title}</p>
                          <p className="mt-1 text-xs text-[#64706b]">
                            {document.chunkCount} chunks · {document.characters} chars
                          </p>
                        </div>
                        <button
                          className="rounded-md border border-[#d8d6cc] px-2 py-1 text-xs hover:bg-white"
                          onClick={() => deleteDocument(document.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-md border border-[#d8d6cc] bg-white p-4">
              <h2 className="text-lg font-semibold">Support prompts</h2>
              <div className="mt-3 space-y-2">
                {quickPrompts.map((prompt) => (
                  <button
                    className="w-full rounded-md border border-[#e6e3d8] bg-[#fbfbf7] px-3 py-2 text-left text-sm leading-6 hover:border-[#2f6f9f]"
                    key={prompt}
                    onClick={() => setMessage(prompt)}
                    type="button"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <section className="grid min-h-[680px] gap-4 lg:grid-cols-[1fr_320px]">
            <div className="flex min-h-[680px] flex-col rounded-md border border-[#d8d6cc] bg-white">
              <div className="border-b border-[#e6e3d8] px-4 py-3">
                <h2 className="text-lg font-semibold">Agent answer desk</h2>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="flex h-full min-h-80 items-center justify-center text-center">
                    <p className="max-w-sm text-sm leading-6 text-[#64706b]">
                      {hasDocuments
                        ? "Ask for customer-ready answers, policy checks, and runbook citations."
                        : "Add a support source first, then ask an agent-style question."}
                    </p>
                  </div>
                ) : (
                  messages.map((item) => (
                    <article
                      className={`max-w-3xl rounded-md px-4 py-3 text-sm leading-6 ${
                        item.role === "user"
                          ? "ml-auto bg-[#e8f0ed]"
                          : "mr-auto border border-[#e6e3d8] bg-[#fbfbf7]"
                      }`}
                      key={item.id}
                    >
                      <p className="whitespace-pre-wrap">{item.content}</p>
                      {item.citations?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.citations.map((citation, index) => (
                            <button
                              className="rounded-md border border-[#b9c8c1] bg-white px-2 py-1 text-xs font-medium text-[#356859] hover:bg-[#f1f7f4]"
                              key={citation.id}
                              onClick={() => setSelectedCitation(citation)}
                              type="button"
                            >
                              [{index + 1}] {citation.title}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))
                )}
                {isAsking ? (
                  <div className="mr-auto rounded-md border border-[#e6e3d8] bg-[#fbfbf7] px-4 py-3 text-sm text-[#64706b]">
                    Searching help docs...
                  </div>
                ) : null}
              </div>

              <form className="border-t border-[#e6e3d8] p-4" onSubmit={askQuestion}>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    className="min-h-11 flex-1 rounded-md border border-[#c9c7bc] px-3 py-2 outline-none focus:border-[#356859]"
                    disabled={!hasDocuments || isAsking}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Ask a customer or agent support question"
                    value={message}
                  />
                  <button
                    className="rounded-md bg-[#182026] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-[#9aa0a6]"
                    disabled={!hasDocuments || isAsking}
                    type="submit"
                  >
                    Ask
                  </button>
                </div>
              </form>
            </div>

            <aside className="rounded-md border border-[#d8d6cc] bg-white p-4">
              <h2 className="text-lg font-semibold">Help doc evidence</h2>
              {selectedCitation ? (
                <div className="mt-4 rounded-md border border-[#e6e3d8] bg-[#fbfbf7] p-3">
                  <p className="text-sm font-semibold">{selectedCitation.title}</p>
                  <p className="mt-1 text-xs text-[#64706b]">
                    Page {selectedCitation.page}
                  </p>
                  <mark className="mt-3 block rounded-md bg-[#fff2a8] px-2 py-2 text-sm leading-6 text-[#1f2933]">
                    {selectedCitation.quote}
                  </mark>
                </div>
              ) : lastAssistant?.citations?.length ? (
                <p className="mt-4 text-sm leading-6 text-[#64706b]">
                  Select a citation under the latest answer to inspect the support article passage.
                </p>
              ) : (
                <p className="mt-4 text-sm leading-6 text-[#64706b]">
                  Support doc passages appear here after a cited answer.
                </p>
              )}
            </aside>
          </section>
        </div>
      </div>
    </main>
  );
}
