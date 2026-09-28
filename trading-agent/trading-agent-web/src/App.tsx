import { useState } from "react";
import { api, ApiError, getSession, type StoredSession } from "./api/client";
import { AuthPage } from "./pages/AuthPage";
import { ChatPage } from "./pages/ChatPage";

export function App() {
  const [session, setSession] = useState<StoredSession | null>(getSession());

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
    } finally {
      setSession(null);
    }
  };

  if (!session) {
    return <AuthPage onAuthed={setSession} />;
  }

  return <ChatPage user={session.user} onLogout={handleLogout} />;
}
