// src/components/ChatInterface.tsx
import { useEffect, useRef, useState } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
} from "@assistant-ui/react";
import { useMessage, useThreadRuntime } from "@assistant-ui/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { IconCopy, IconCheck, IconRefresh, IconPlayerStop, IconDownload, IconTable, IconCode } from "@tabler/icons-react";
import type { SupportedModel } from "../App";
import { useSupabaseRuntime } from "../lib/useSupabaseRuntime";
import ErrorBoundary from "./ErrorBoundary";

/* ------------------------------------------------------------------
   Small helpers: Pill (status/severity badge)
   ------------------------------------------------------------------ */
function Pill({ value }: { value?: string | number | null }) {
  if (value === null || value === undefined || String(value) === "") return null;
  const v = String(value).toLowerCase();

  let style = "bg-slate-700 text-slate-200";
  if (["critical", "high", "severe"].includes(v)) style = "bg-red-600 text-white";
  else if (["major", "warning"].includes(v)) style = "bg-yellow-400 text-black";
  else if (["minor", "low"].includes(v)) style = "bg-blue-500 text-white";
  else if (["closed", "completed", "resolved"].includes(v)) style = "bg-emerald-600 text-white";
  else if (["open", "pending", "active"].includes(v)) style = "bg-orange-500 text-white";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${style}`}>
      {String(value)}
    </span>
  );
}

/* ------------------------------------------------------------------
   Safe Markdown wrapper for react-markdown v9+
   - DOES NOT pass className into ReactMarkdown root
   - Provides safe components that omit className prop
   ------------------------------------------------------------------ */
function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // Provide safe renderers that filter out className from props
        components={{
          p: ({ className, ...props }: any) => <p {...props} />,
          h1: ({ className, ...props }: any) => <h1 {...props} />,
          h2: ({ className, ...props }: any) => <h2 {...props} />,
          h3: ({ className, ...props }: any) => <h3 {...props} />,
          h4: ({ className, ...props }: any) => <h4 {...props} />,
          ul: ({ className, ...props }: any) => <ul {...props} />,
          ol: ({ className, ...props }: any) => <ol {...props} />,
          li: ({ className, ...props }: any) => <li {...props} />,
          code: ({ node, ...props }: any) =>
            'inline' in props && props.inline ? <code {...props} /> : <pre className="bg-black/40 p-2 rounded"><code {...props} /></pre>,
          a: ({ className, ...props }: any) => <a {...props} />,
          strong: ({ className, ...props }: any) => <strong {...props} />,
          em: ({ className, ...props }: any) => <em {...props} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

/* ------------------------------------------------------------------
   Collapsible code block (Option A)
   Safe stringify and toggle
   ------------------------------------------------------------------ */
function CollapsibleCode({ title, code }: { title: string; code: any }) {
  const [open, setOpen] = useState(false);
  let safeText: string;
  try {
    safeText = typeof code === "string" ? code : JSON.stringify(code, null, 2);
  } catch {
    safeText = String(code);
  }

  return (
    <div className="my-4 bg-slate-900/60 border border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((s) => !s)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800/50 text-emerald-300 hover:bg-slate-800 transition"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          {open ? "▼" : "▶"}
          <IconCode size={16} />
        </span>
        <span className="font-semibold text-sm">{title}</span>
        <span className="ml-2 text-xs text-slate-400">{open ? "collapse" : "expand"}</span>
      </button>

      {open && (
        <pre className="p-4 text-xs overflow-x-auto whitespace-pre-wrap text-slate-200 bg-black/40 leading-relaxed">
          {safeText}
        </pre>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   Tool result renderer (table or fallback collapsible code)
   - safe extraction of result.data
   - CSV export for table-like results
   ------------------------------------------------------------------ */
function ToolResultCard({ toolName, result }: { toolName?: string; result: any }) {
  let data: any = null;
  try {
    data = result?.data ?? result ?? null;
  } catch {
    data = result;
  }

  const isTable =
    Array.isArray(data) &&
    data.length > 0 &&
    typeof data[0] === "object" &&
    !Array.isArray(data[0]);

  const title = toolName || "Tool Result";

  const exportCsv = () => {
    if (!isTable) return;
    try {
      const header = Object.keys(data[0]);
      const rows = data.map((r: any) =>
        header
          .map((h) => {
            const v = r[h];
            if (v === null || v === undefined) return "";
            // escape quotes
            return `"${String(v).replace(/"/g, '""')}"`;
          })
          .join(",")
      );
      const csv = [header.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "_")}.csv`;
      a.click();
    } catch {
      // ignore
    }
  };

  return (
    <div className="my-6 bg-slate-900/50 border border-slate-700 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-emerald-600/20 border-b border-slate-700">
        <div className="flex items-center gap-2 text-emerald-300 font-semibold">
          <IconTable size={16} />
          <span>{title}</span>
        </div>

        <div className="flex items-center gap-3">
          {isTable && (
            <button onClick={exportCsv} className="flex items-center gap-2 text-emerald-300 hover:text-emerald-100 text-xs">
              <IconDownload size={14} /> CSV
            </button>
          )}
        </div>
      </div>

      <div className="p-4 overflow-x-auto">
        {isTable ? (
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-800">
                {Object.keys(data[0]).map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2 border border-slate-700 text-left font-semibold whitespace-nowrap"
                    style={{ maxWidth: 240 }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {data.map((row: any, rIdx: number) => (
                <tr key={rIdx} className={rIdx % 2 === 0 ? "bg-slate-900/30" : "bg-slate-900/20"}>
                  {Object.keys(data[0]).map((k) => (
                    <td
                      key={k}
                      className="px-3 py-2 border border-slate-800 align-top whitespace-nowrap"
                      style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {["severity", "status", "priority"].includes(k.toLowerCase()) ? (
                        <Pill value={row[k]} />
                      ) : typeof row[k] === "object" ? (
                        <span className="text-xs font-mono">{JSON.stringify(row[k])}</span>
                      ) : (
                        <span>{String(row[k] ?? "")}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <CollapsibleCode title={`${title} — Raw Output`} code={data ?? result} />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Main ChatInterface
   - single file, no external animation deps
   - ensures one-time callbacks using refs stored in component
   ------------------------------------------------------------------ */
export default function ChatInterface({
  model,
  onUserMessage,
  onAssistantMessage,
  onToolResult,
}: {
  model: SupportedModel;
  onUserMessage?: (text: string) => void;
  onAssistantMessage?: (text: string) => void;
  onToolResult?: (title: string, data: unknown) => void;
}) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "http://127.0.0.1:54321";
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
  const adapter = useSupabaseRuntime({ model, supabaseUrl, supabaseAnonKey });
  const runtime = useLocalRuntime(adapter);

  // Refs to avoid multiple callbacks/infinite loops
  const deliveredAssistantRef = useRef<Record<string, boolean>>({});
  const processedToolsRef = useRef<Record<string, boolean>>({});
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Autofocus input on mount (new chat)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex flex-col h-full p-0 pt-16">
        <div className="flex-1 flex flex-col overflow-hidden">
          <ThreadPrimitive.Root className="flex flex-col h-full bg-transparent">
            <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto px-6 py-4 flex flex-col scrollbar-custom">
              <ThreadPrimitive.Empty>
                <div className="flex items-center justify-center h-full text-center">
                  <h2 className="m-0 text-slate-100 dark:text-slate-100 light:text-gray-800 text-3xl font-medium">Where should we begin?</h2>
                </div>
              </ThreadPrimitive.Empty>

              <ThreadPrimitive.Messages
                components={{
                  UserMessage: () => {
                    const message = useMessage();
                    const isComplete = message.status?.type === "complete";
                    const deliveredRef = useRef(false);

                    useEffect(() => {
                      if (!isComplete || deliveredRef.current || !onUserMessage) return;
                      try {
                        const text = message.content.filter((p) => p.type === "text").map((p: any) => p.text).join("\n");
                        if (text) {
                          deliveredRef.current = true;
                          onUserMessage(text);
                        }
                      } catch {
                        // ignore
                      }
                    }, [isComplete]);

                    return (
                      <MessagePrimitive.Root className="mb-4 animate-[fadeIn_0.25s_ease-in]">
                        <div className="flex justify-end items-end gap-3">
                          <div className="max-w-[85%] p-4 bg-emerald-600 dark:bg-emerald-600 light:bg-emerald-500 text-white rounded-xl rounded-br-sm">
                            <MessagePrimitive.Content />
                          </div>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400"></div>
                        </div>
                      </MessagePrimitive.Root>
                    );
                  },

                  AssistantMessage: () => {
                    const message = useMessage();
                    const isComplete = message.status?.type === "complete";
                    const threadRuntime = useThreadRuntime();
                    const [copied, setCopied] = useState(false);
                    const [showTools, setShowTools] = useState(false);
                    
                    const toolParts = message.content.filter((p) => p.type === "tool-call");
                    const hasTools = toolParts.length > 0;

                    useEffect(() => {
                      if (!isComplete) return;
                      const mid = message.id;

                      // assistant text callback once per message
                      try {
                        if (!deliveredAssistantRef.current[mid] && onAssistantMessage) {
                          const text = message.content.filter((p) => p.type === "text").map((p: any) => p.text).join("\n");
                          if (text) {
                            deliveredAssistantRef.current[mid] = true;
                            onAssistantMessage(text);
                          }
                        }
                      } catch {
                        // ignore
                      }

                      // tool result callback once per toolCallId
                      if (onToolResult) {
                        message.content.forEach((part: any) => {
                          try {
                            if (part.type !== "tool-call") return;
                            const tid = part.toolCallId;
                            if (!tid) return;
                            if (part.result?.data && !processedToolsRef.current[tid]) {
                              processedToolsRef.current[tid] = true;
                              onToolResult(part.toolName ?? "Tool Result", part.result.data);
                            }
                          } catch {
                            // ignore per tool
                          }
                        });
                      }
                    }, [isComplete, message.id]);

                    const handleCopy = () => {
                      try {
                        const text = message.content.filter((p) => p.type === "text").map((p: any) => p.text).join("\n");
                        navigator.clipboard.writeText(text);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      } catch {
                        // ignore
                      }
                    };

                    return (
                      <MessagePrimitive.Root className="mb-6 animate-[fadeIn_0.25s_ease-in] flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">CT</span>
                        </div>

                        <div className="max-w-[85%] text-slate-100 dark:text-slate-100 light:text-gray-800">
                          {/* Tool parts - Displayed above when toggled */}
                          {hasTools && showTools && (
                            <div className="mb-3">
                              {toolParts.map((p: any, i: number) => (
                                <ErrorBoundary key={`tool-${i}`}>
                                  <ToolResultCard toolName={p.toolName ?? "Tool"} result={p.result ?? p} />
                                </ErrorBoundary>
                              ))}
                            </div>
                          )}

                          {/* Tool toggle button - At the top */}
                          {hasTools && (
                            <div className="mb-2">
                              <button
                                onClick={() => setShowTools(!showTools)}
                                className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
                              >
                                <span className={`transform transition-transform ${showTools ? 'rotate-180' : ''}`}>▼</span>
                                <span>{showTools ? 'Hide Results' : 'Thinking...'} ({toolParts.length})</span>
                              </button>
                            </div>
                          )}

                          <div className="p-4 rounded-xl rounded-bl-sm bg-slate-800/40 dark:bg-slate-800/40 light:bg-white shadow-xl border border-slate-700 dark:border-slate-700 light:border-gray-200">
                            {/* Text parts */}
                            {message.content
                              .filter((p) => p.type === "text")
                              .map((p: any, i: number) => (
                                <div key={`t-${i}`} className="mb-3">
                                  <Markdown>{p.text}</Markdown>
                                </div>
                              ))}

                            {/* Action bar */}
                            {isComplete && (
                              <div className="flex gap-2 mt-3">
                                <button onClick={handleCopy} className="p-2 bg-slate-700/50 rounded-md">
                                  {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                                </button>

                                <button
                                  onClick={() => {
                                    if (message.parentId) threadRuntime.startRun(message.parentId);
                                  }}
                                  className="p-2 bg-slate-700/50 rounded-md"
                                >
                                  <IconRefresh size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </MessagePrimitive.Root>
                    );
                  },
                }}
              />
            </ThreadPrimitive.Viewport>

            <ThreadPrimitive.If running>
              <div className="flex justify-center my-4">
                <ComposerPrimitive.Cancel className="py-2 px-6 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold shadow-md flex items-center gap-2">
                  <IconPlayerStop size={18} />
                  Stop Generating
                </ComposerPrimitive.Cancel>
              </div>
            </ThreadPrimitive.If>

            <ComposerPrimitive.Root className="flex gap-3 p-6 bg-transparent rounded-3xl border border-emerald-500/30 dark:border-emerald-500/30 light:border-emerald-400 my-6 mx-auto max-w-[900px] w-full shadow-[0_2px_12px_rgba(0,0,0,0.35)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.35)] light:shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
              <ComposerPrimitive.Input
                ref={inputRef}
                className="flex-1 py-2 border-0 bg-transparent text-slate-100 dark:text-slate-100 light:text-gray-800 text-base font-inherit transition-all duration-200 resize-none min-h-6 max-h-48 focus:outline-none placeholder:text-slate-600 dark:placeholder:text-slate-600 light:placeholder:text-gray-400"
                placeholder="Ask anything"
              />
              <ComposerPrimitive.Send className="py-2 px-4 rounded-lg border-0 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold cursor-pointer transition-all duration-200">
                Send
              </ComposerPrimitive.Send>
            </ComposerPrimitive.Root>
          </ThreadPrimitive.Root>
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}
