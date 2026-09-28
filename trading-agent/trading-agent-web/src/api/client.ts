import type {
  AuthResponse,
  AuthTokens,
  ChatResponse,
  ChatSession,
  HistoryResponse,
  User,
} from "@trading-agent/contracts";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080";

const TOKENS_KEY = "ta.tokens";
const USER_KEY = "ta.user";

export interface StoredSession {
  user: User;
  tokens: AuthTokens;
}

const load = (): StoredSession | null => {
  const tokens = localStorage.getItem(TOKENS_KEY);
  const user = localStorage.getItem(USER_KEY);
  if (!tokens || !user) return null;
  try {
    return { tokens: JSON.parse(tokens), user: JSON.parse(user) } as StoredSession;
  } catch {
    return null;
  }
};

let session: StoredSession | null = load();

export const getSession = (): StoredSession | null => session;

export const persistSession = (next: StoredSession | null): void => {
  session = next;
  if (!next) {
    localStorage.removeItem(TOKENS_KEY);
    localStorage.removeItem(USER_KEY);
    return;
  }
  localStorage.setItem(TOKENS_KEY, JSON.stringify(next.tokens));
  localStorage.setItem(USER_KEY, JSON.stringify(next.user));
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const rawRequest = async (
  path: string,
  init: RequestInit,
  token?: string,
  retry = true,
): Promise<Response> => {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (res.status === 401 && retry && session?.tokens.refreshToken) {
    const refreshed = await tryRefresh();
    if (refreshed) return rawRequest(path, init, refreshed.tokens.accessToken, false);
  }
  return res;
};

const tryRefresh = async (): Promise<StoredSession | null> => {
  if (!session) return null;
  const res = await fetch(`${BASE_URL}/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: session.tokens.refreshToken }),
  });
  if (!res.ok) {
    persistSession(null);
    return null;
  }
  const data = (await res.json()) as AuthResponse;
  const next: StoredSession = { user: data.user, tokens: data.tokens };
  persistSession(next);
  return next;
};

const parse = async <T>(res: Response): Promise<T> => {
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (body as { error?: { message?: string } }).error?.message ?? res.statusText;
    throw new ApiError(res.status, message);
  }
  return body as T;
};

const authHeaders = (): { token?: string } => ({ token: session?.tokens.accessToken });

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const res = await rawRequest(path, init, authHeaders().token);
  return parse<T>(res);
};

export const api = {
  async signup(email: string, password: string): Promise<StoredSession> {
    const data = await request<AuthResponse>("/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const next: StoredSession = { user: data.user, tokens: data.tokens };
    persistSession(next);
    return next;
  },

  async login(email: string, password: string): Promise<StoredSession> {
    const data = await request<AuthResponse>("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const next: StoredSession = { user: data.user, tokens: data.tokens };
    persistSession(next);
    return next;
  },

  async logout(): Promise<void> {
    try {
      await request<void>("/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken: session?.tokens.refreshToken }),
      });
    } finally {
      persistSession(null);
    }
  },

  chat(sessionId: string | undefined, message: string): Promise<ChatResponse> {
    return request<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify({ sessionId, message }),
    });
  },

  listSessions(): Promise<{ sessions: ChatSession[] }> {
    return request<{ sessions: ChatSession[] }>("/chatsession");
  },

  history(sessionId: string, limit = 50, cursor?: string): Promise<HistoryResponse> {
    const params = new URLSearchParams({ sessionId, limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return request<HistoryResponse>(`/history?${params.toString()}`);
  },

  deleteSession(sessionId: string): Promise<void> {
    return request<void>(`/chatsession/${sessionId}`, { method: "DELETE" });
  },
};
