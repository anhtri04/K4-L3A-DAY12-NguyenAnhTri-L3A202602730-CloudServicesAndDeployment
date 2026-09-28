/**
 * Shared, runtime-free contracts for the Trading Agent MVP.
 *
 * IMPORTANT: this package is types-only. Consumers must import with
 * `import type { ... } from "@trading-agent/contracts"` so nothing is
 * required at runtime. No values are exported on purpose.
 */

/* ------------------------------------------------------------------ */
/* Domain models                                                       */
/* ------------------------------------------------------------------ */

export type UserId = string;
export type SessionId = string;
export type MessageId = string;

export interface User {
  id: UserId;
  email: string;
  createdAt: string;
}

export interface ChatSession {
  id: SessionId;
  userId: UserId;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    /** JSON-encoded arguments as produced by the model. */
    arguments: string;
  };
}

export interface Message {
  id: MessageId;
  sessionId: SessionId;
  role: MessageRole;
  content: string;
  toolCalls: ToolCall[] | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Agent (OpenAI-compatible tool calling)                              */
/* ------------------------------------------------------------------ */

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    /** JSON Schema object describing the function parameters. */
    parameters: Record<string, unknown>;
  };
}

/** Shape an agent implementation must return. */
export interface AgentRunResult {
  content: string;
  toolCalls: ToolCall[];
}

/** Input handed to the agent runtime. */
export interface AgentRunInput {
  messages: Pick<Message, "role" | "content" | "toolCalls">[];
  tools: ToolDefinition[];
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Access token lifetime in seconds. */
  expiresIn: number;
  tokenType: "Bearer";
}

export interface SignupRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

/* ------------------------------------------------------------------ */
/* Chat / sessions / history                                           */
/* ------------------------------------------------------------------ */

export interface ChatRequest {
  /** When omitted, a new session is created. */
  sessionId?: SessionId;
  message: string;
}

export interface ChatResponse {
  sessionId: SessionId;
  message: Message;
}

export interface CreateSessionRequest {
  title?: string;
}

export interface ListSessionsResponse {
  sessions: ChatSession[];
}

export interface HistoryQuery {
  sessionId: SessionId;
  limit?: number;
  /** Opaque cursor: the id of the oldest message already seen. */
  cursor?: MessageId;
}

export interface HistoryResponse {
  messages: Message[];
  nextCursor: MessageId | null;
}

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    requestId?: string;
  };
}

/* ------------------------------------------------------------------ */
/* Routing surface                                                     */
/* ------------------------------------------------------------------ */

/** Endpoints the gateway leaves unauthenticated. */
export type PublicRoute = "/signup" | "/login" | "/refresh";

/** Endpoints the gateway protects (valid JWT + not blacklisted). */
export type ProtectedRoute =
  | "/logout"
  | "/chat"
  | "/chatsession"
  | "/history";

export type ApiRoute = PublicRoute | ProtectedRoute;
