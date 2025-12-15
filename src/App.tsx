import { useEffect, useMemo, useState, useCallback } from "react";
void useMemo
import ChatInterface from "./components/ChatInterface";
import FilesView from "./components/FilesView";
import ReportPreview from "./components/ReportPreview";
import ModelSelector from "./components/ModelSelector";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { IconMoon, IconSun, IconBrandSlack, IconMail, IconChecklist } from "@tabler/icons-react";

export type SupportedModel = "gpt-5.1" | "gpt-5-mini" | "gpt-5.1-nano";
export type ViewMode = "chat" | "files" | "report";

const MODEL_OPTIONS = [
  { value: "gpt-5.1", label: "GPT-5.1" },
  { value: "gpt-5-mini", label: "GPT-5 Mini" },
  { value: "gpt-5.1-nano", label: "GPT-5.1 Nano" },
];

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const [selectedModel, setSelectedModel] = useState<SupportedModel>("gpt-5.1");
  const [viewMode, setViewMode] = useState<ViewMode>("chat");
  const [currentChatTitle, setCurrentChatTitle] = useState("UAV Maintenance Analysis");
  const [selectedFileTitle, setSelectedFileTitle] = useState<string | null>(null);
  const [chatKey, setChatKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Store all messages for dynamic report generation
  const [userMessages, setUserMessages] = useState<string[]>([]);
  const [assistantMessages, setAssistantMessages] = useState<string[]>([]);

  const [toolTables, setToolTables] = useState<{ headers: string[]; rows: any[][] }[]>([]);
  const [pendingPrint, setPendingPrint] = useState(false);

  // const chartPoints = useMemo(() => [45, 52, 48, 60, 62, 70, 78, 84], []);

  useEffect(() => {
    if (viewMode !== "report" || !pendingPrint) return;

    const timer = setTimeout(() => {
      window.print();
      setPendingPrint(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [pendingPrint, viewMode]);

  // ---------------------
  // Handlers
  // ---------------------
  const handleNewChat = () => {
    setChatKey((prev) => prev + 1);
    setViewMode("chat");
    setCurrentChatTitle("New Chat");
    setUserMessages([]);
    setAssistantMessages([]);
    setToolTables([]);
  };

  const handleUserMessage = useCallback((text: string) => {
    if (!text) return;

    // Add to messages array
    setUserMessages((prev) => [...prev, text]);

    // Extract RCA/WO number from user message for dynamic title
    const rcaMatch = text.match(/([0-9]D-\d{3,5})/i);
    if (rcaMatch && !selectedFileTitle) {
      const rcaNumber = rcaMatch[1];
      setSelectedFileTitle(rcaNumber);
      setCurrentChatTitle(rcaNumber);
    } else {
      const trimmed = text.trim();
      const shortened = trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed;
      setCurrentChatTitle(shortened || "Recent Chat");
    }
  }, [selectedFileTitle]);

  const handleAssistantMessage = useCallback((text: string) => {
    if (!text) return;
    setAssistantMessages((prev) => [...prev, text]);
    
    // Extract RCA/WO number from assistant message for dynamic title
    if (!selectedFileTitle) {
      const rcaMatch = text.match(/([0-9]D-\d{3,5})/i);
      if (rcaMatch) {
        const rcaNumber = rcaMatch[1];
        setSelectedFileTitle(rcaNumber);
        setCurrentChatTitle(rcaNumber);
      }
    }
  }, [selectedFileTitle]);

  const handleToolResult = useCallback((_title: string, data: any) => {
    if (!Array.isArray(data) || !data.length) return;
    if (typeof data[0] !== "object") return;

    const headers = Object.keys(data[0]);
    const rows = data.map((row) => headers.map((h) => row[h]));

    setToolTables((prev) => [{ headers, rows }, ...prev].slice(0, 5));
  }, []);

  const handleExportReport = () => {
    setViewMode("report");
    setPendingPrint(true);
  };

  const handleFileSelect = useCallback((title: string, _fileType: string) => {
    setSelectedFileTitle(title);
  }, []);

  const handleComingSoon = () => {
    alert('Coming Soon!');
  };

  return (
    <div className="flex h-screen bg-slate-950 dark:bg-slate-950 light:bg-gray-50">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-56 bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] flex-col">
        <div className="p-4 border-b border-[var(--border-primary)] flex items-center gap-3 bg-[var(--bg-primary)]">
          <div className="w-8 h-8 rounded bg-[var(--accent)] flex items-center justify-center">
            <span className="text-white font-bold text-lg">⬢</span>
          </div>
          <div>
            <h2 className="text-[var(--text-primary)] text-sm font-semibold">Crownwell AI</h2>
            <p className="text-xs text-[var(--text-secondary)]">AgentInterface</p>
          </div>
        </div>

        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm"
          >
            + New Chat
          </button>
        </div>

        <div className="px-3 py-2">
          <h3 className="text-xs text-slate-400 dark:text-slate-400 light:text-gray-500 uppercase mb-2">TODAY</h3>
          <button
            onClick={() => setViewMode("chat")}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
              viewMode === "chat"
                ? "bg-emerald-500/20 text-[var(--text-primary)]"
                : "text-slate-300 dark:text-slate-300 light:text-gray-700 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-gray-100"
            }`}
          >
            🎯 {currentChatTitle}
          </button>
        </div>

        <div className="px-3 py-2 border-t border-[var(--border-primary)]">
          <h3 className="text-xs text-[var(--text-secondary)] uppercase mb-2">WORKSPACES</h3>
          <button
            onClick={() => setViewMode("files")}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
              viewMode === "files"
                ? "bg-emerald-500/20 text-[var(--text-primary)]"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
            }`}
          >
            📁 Browse Files
          </button>
        </div>

        <div className="px-3 py-2 border-t border-slate-800 dark:border-slate-800 light:border-gray-200">
          <h3 className="text-xs text-slate-400 dark:text-slate-400 light:text-gray-500 uppercase mb-2">INTEGRATIONS</h3>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleComingSoon}
              className="p-2 rounded-lg text-slate-300 dark:text-slate-300 light:text-gray-700 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-gray-100 transition-colors"
              title="Jira"
            >
              <IconChecklist size={20} />
            </button>
            <button
              onClick={handleComingSoon}
              className="p-2 rounded-lg text-slate-300 dark:text-slate-300 light:text-gray-700 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-gray-100 transition-colors"
              title="Mail"
            >
              <IconMail size={20} />
            </button>
            <button
              onClick={handleComingSoon}
              className="p-2 rounded-lg text-slate-300 dark:text-slate-300 light:text-gray-700 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-gray-100 transition-colors"
              title="Slack"
            >
              <IconBrandSlack size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1"></div>

        <div className="border-t border-slate-800 dark:border-slate-800 light:border-gray-200 p-3 space-y-2">
          <button 
            onClick={toggleTheme}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 dark:text-slate-300 light:text-gray-700 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-gray-100 flex items-center gap-2"
          >
            {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          {/* <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 dark:text-slate-300 light:text-gray-700 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-gray-100">
            ⚙️ Settings
          </button>

          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400"></div>
            <div>
              <p className="text-white dark:text-white light:text-gray-900 text-sm font-medium">Sarah Jenkins</p>
              <p className="text-xs text-slate-400 dark:text-slate-400 light:text-gray-500">Lead Analyst</p>
            </div>
          </div> */}
        </div>
      </aside>

      {/* MOBILE SIDEBAR (drawer) */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] transition-transform duration-200 md:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!sidebarOpen}
      >
        <div className="p-4 border-b border-[var(--border-primary)] flex items-center gap-3 bg-[var(--bg-primary)]">
          <div className="w-8 h-8 rounded bg-[var(--accent)] flex items-center justify-center">
            <span className="text-white font-bold text-lg">⬢</span>
          </div>
          <div>
            <h2 className="text-[var(--text-primary)] text-sm font-semibold">Crownwell AI</h2>
            <p className="text-xs text-[var(--text-secondary)]">AgentInterface</p>
          </div>
          <div className="ml-auto">
            <button onClick={() => setSidebarOpen(false)} className="p-2 text-sm text-slate-300">
              ✕
            </button>
          </div>
        </div>

        <div className="p-3">
          <button
            onClick={() => { handleNewChat(); setSidebarOpen(false); }}
            className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm"
          >
            + New Chat
          </button>
        </div>

        <div className="px-3 py-2">
          <h3 className="text-xs text-slate-400 dark:text-slate-400 light:text-gray-500 uppercase mb-2">TODAY</h3>
          <button
            onClick={() => { setViewMode("chat"); setSidebarOpen(false); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
              viewMode === "chat"
                ? "bg-emerald-500/20 text-[var(--text-primary)]"
                : "text-slate-300 dark:text-slate-300 light:text-gray-700 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-gray-100"
            }`}
          >
            🎯 {currentChatTitle}
          </button>
        </div>

        <div className="px-3 py-2 border-t border-[var(--border-primary)]">
          <h3 className="text-xs text-[var(--text-secondary)] uppercase mb-2">WORKSPACES</h3>
          <button
            onClick={() => { setViewMode("files"); setSidebarOpen(false); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
              viewMode === "files"
                ? "bg-emerald-500/20 text-[var(--text-primary)]"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
            }`}
          >
            📁 Browse Files
          </button>
        </div>

        <div className="px-3 py-2 border-t border-slate-800 dark:border-slate-800 light:border-gray-200">
          <h3 className="text-xs text-slate-400 dark:text-slate-400 light:text-gray-500 uppercase mb-2">INTEGRATIONS</h3>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleComingSoon}
              className="p-2 rounded-lg text-slate-300 dark:text-slate-300 light:text-gray-700 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-gray-100 transition-colors"
              title="Jira"
            >
              <IconChecklist size={20} />
            </button>
            <button
              onClick={handleComingSoon}
              className="p-2 rounded-lg text-slate-300 dark:text-slate-300 light:text-gray-700 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-gray-100 transition-colors"
              title="Mail"
            >
              <IconMail size={20} />
            </button>
            <button
              onClick={handleComingSoon}
              className="p-2 rounded-lg text-slate-300 dark:text-slate-300 light:text-gray-700 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-gray-100 transition-colors"
              title="Slack"
            >
              <IconBrandSlack size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1"></div>

        <div className="border-t border-slate-800 dark:border-slate-800 light:border-gray-200 p-3 space-y-2">
          <button 
            onClick={() => { toggleTheme(); setSidebarOpen(false); }}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-300 dark:text-slate-300 light:text-gray-700 hover:bg-slate-800 dark:hover:bg-slate-800 light:hover:bg-gray-100 flex items-center gap-2"
          >
            {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </div>

      {/* MOBILE OVERLAY */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-primary)]">
        <header className="border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/60 p-4 flex justify-between">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden mr-3 p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
              aria-label="Open menu"
            >
              ☰
            </button>
            <h1 className="text-lg text-[var(--text-primary)] font-semibold">
              {viewMode === "files" || viewMode === "report" ? selectedFileTitle || currentChatTitle : currentChatTitle}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} />
            {(userMessages.length > 0 || assistantMessages.length > 0) && (
              <button
                onClick={handleExportReport}
                className="px-4 py-2 border border-[color:rgba(47,143,107,0.4)] rounded-lg text-[var(--accent)] hover:bg-[color:rgba(47,143,107,0.08)] text-sm"
              >
                📤 Export Report
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-hidden min-h-0">
          <ErrorBoundary>
            {viewMode === "chat" && (
              <ChatInterface
                key={chatKey}
                model={selectedModel}
                onUserMessage={handleUserMessage}
                onAssistantMessage={handleAssistantMessage}
                onToolResult={handleToolResult}
              />
            )}

            {viewMode === "files" && <FilesView onFileSelect={handleFileSelect} />}

            {viewMode === "report" && (
              <ReportPreview
                title={selectedFileTitle || currentChatTitle}
                userMessages={userMessages}
                assistantMessages={assistantMessages}
                tables={toolTables}
                modelLabel={MODEL_OPTIONS.find(m => m.value === selectedModel)?.label || selectedModel}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
