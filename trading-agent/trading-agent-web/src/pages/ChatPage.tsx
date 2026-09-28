import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import type { ChatSession, Message, User } from "@trading-agent/contracts";
import { api } from "../api/client";
import {
  ComposeIcon,
  LogoutIcon,
  PanelIcon,
  SendIcon,
  SparkleIcon,
  TrashIcon,
} from "../components/icons";

const HISTORY_PAGE_SIZE = 50;

const relativeTime = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
};

interface SessionGroup {
  label: string;
  items: ChatSession[];
}

const groupSessions = (sessions: ChatSession[]): SessionGroup[] => {
  const day = 86_400_000;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const buckets: { label: string; items: ChatSession[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Previous 30 days", items: [] },
    { label: "Older", items: [] },
  ];

  for (const session of sessions) {
    const t = new Date(session.updatedAt).getTime();
    if (t >= startOfToday) buckets[0].items.push(session);
    else if (t >= startOfToday - day) buckets[1].items.push(session);
    else if (t >= startOfToday - 7 * day) buckets[2].items.push(session);
    else if (t >= startOfToday - 30 * day) buckets[3].items.push(session);
    else buckets[4].items.push(session);
  }

  return buckets.filter((bucket) => bucket.items.length > 0);
};

interface ComposerProps {
  value: string;
  busy: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

function Composer({ value, busy, onChange, onSubmit }: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  const canSend = value.trim().length > 0 && !busy;

  return (
    <div className="composer">
      <div className="composer-box">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Trading Agent"
          disabled={busy}
        />
        <button
          className="send-btn"
          onClick={onSubmit}
          disabled={!canSend}
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </div>
      <p className="composer-hint">Trading Agent can make mistakes. Verify important information.</p>
    </div>
  );
}

export function ChatPage({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadSessions = async () => {
    try {
      const data = await api.listSessions();
      setSessions(data.sessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    }
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectSession = async (id: string) => {
    setActiveId(id);
    setError(null);
    setMessages([]);
    setNextCursor(null);
    setLoadingHistory(true);
    try {
      const page = await api.history(id, HISTORY_PAGE_SIZE);
      setMessages(page.messages);
      setNextCursor(page.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadOlder = async () => {
    if (!activeId || !nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await api.history(activeId, HISTORY_PAGE_SIZE, nextCursor);
      setMessages((prev) => [...page.messages, ...prev]);
      setNextCursor(page.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load older messages");
    } finally {
      setLoadingOlder(false);
    }
  };

  const newChat = () => {
    setActiveId(null);
    setMessages([]);
    setNextCursor(null);
    setError(null);
    setDraft("");
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;

    setBusy(true);
    setDraft("");
    setError(null);

    const optimistic: Message = {
      id: `local-${Date.now()}`,
      sessionId: activeId ?? "",
      role: "user",
      content: text,
      toolCalls: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const result = await api.chat(activeId ?? undefined, text);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimistic.id),
        { ...optimistic, sessionId: result.sessionId },
        result.message,
      ]);
      if (!activeId) setActiveId(result.sessionId);
      await loadSessions();
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(text);
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setBusy(false);
    }
  };

  const removeSession = async (id: string, title: string, event: MouseEvent) => {
    event.stopPropagation();
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await api.deleteSession(id);
      if (activeId === id) newChat();
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session");
    }
  };

  const isEmpty = messages.length === 0 && !loadingHistory;

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? "" : "closed"}`}>
        <div className="sidebar-top">
          <button className="ghost-btn" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
            <PanelIcon />
          </button>
          <span className="brand">Trading Agent</span>
        </div>

        <button className="new-chat" onClick={newChat}>
          <ComposeIcon />
          <span>New chat</span>
        </button>

        <nav className="history">
          {sessions.length === 0 ? (
            <p className="history-empty">No conversations yet.</p>
          ) : (
            groupSessions(sessions).map((group) => (
              <div key={group.label} className="history-group">
                <div className="history-label">{group.label}</div>
                {group.items.map((session) => (
                  <div
                    key={session.id}
                    className={`history-item ${session.id === activeId ? "active" : ""}`}
                    onClick={() => selectSession(session.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void selectSession(session.id);
                    }}
                  >
                    <span className="history-title">{session.title}</span>
                    <button
                      className="history-delete"
                      title="Delete"
                      aria-label="Delete conversation"
                      onClick={(e) => removeSession(session.id, session.title, e)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </nav>

        <div className="sidebar-bottom">
          <div className="account">
            <span className="avatar user">{user.email.charAt(0).toUpperCase()}</span>
            <span className="account-email">{user.email}</span>
          </div>
          <button className="ghost-btn" onClick={onLogout} title="Log out" aria-label="Log out">
            <LogoutIcon />
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          {!sidebarOpen && (
            <button className="ghost-btn" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
              <PanelIcon />
            </button>
          )}
          <span className="model-name">Trading Agent</span>
        </header>

        {isEmpty ? (
          <div className="welcome">
            <div className="welcome-inner">
              <span className="welcome-logo">
                <SparkleIcon size={28} />
              </span>
              <h1>What can I help with?</h1>
              <Composer value={draft} busy={busy} onChange={setDraft} onSubmit={send} />
            </div>
          </div>
        ) : (
          <>
            <div className="messages">
              {activeId && nextCursor && (
                <button className="load-older" onClick={loadOlder} disabled={loadingOlder}>
                  {loadingOlder ? "Loading..." : "Load older messages"}
                </button>
              )}

              {loadingHistory ? (
                <p className="muted center-text">Loading history...</p>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`msg ${message.role}`}>
                    {message.role === "assistant" && (
                      <span className="avatar assistant">
                        <SparkleIcon size={16} />
                      </span>
                    )}
                    <div className="msg-body">
                      <div className="msg-content">{message.content}</div>
                      <span className="msg-time">{relativeTime(message.createdAt)}</span>
                    </div>
                    {message.role === "user" && (
                      <span className="avatar user">
                        {user.email.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            <div className="composer-area">
              {error && <p className="error">{error}</p>}
              <Composer value={draft} busy={busy} onChange={setDraft} onSubmit={send} />
            </div>
          </>
        )}

        {isEmpty && error && <p className="error welcome-error">{error}</p>}
      </main>
    </div>
  );
}
