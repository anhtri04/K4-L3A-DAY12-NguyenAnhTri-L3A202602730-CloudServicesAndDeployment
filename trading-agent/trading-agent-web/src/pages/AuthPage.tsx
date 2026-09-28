import { useState, type FormEvent } from "react";
import { api, type StoredSession } from "../api/client";
import { SparkleIcon } from "../components/icons";

type Mode = "login" | "signup";

export function AuthPage({ onAuthed }: { onAuthed: (session: StoredSession) => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const session =
        mode === "login"
          ? await api.login(email, password)
          : await api.signup(email, password);
      onAuthed(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <span className="auth-logo">
          <SparkleIcon size={26} />
        </span>
        <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="auth-sub">
          {mode === "login"
            ? "Sign in to continue to Trading Agent"
            : "Start chatting with Trading Agent"}
        </p>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="At least 8 characters"
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="primary-btn" disabled={busy}>
          {busy ? "Please wait..." : mode === "login" ? "Continue" : "Sign up"}
        </button>

        <button
          type="button"
          className="link centered"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
        >
          {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Log in"}
        </button>
      </form>
    </div>
  );
}
