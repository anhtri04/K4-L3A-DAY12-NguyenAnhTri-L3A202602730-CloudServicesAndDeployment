import type {
  ChatSession,
  Message,
  MessageRole,
  ToolCall,
} from "@trading-agent/contracts";
import type { ChatSession as PrismaSession, Message as PrismaMessage } from "@prisma/client";

export const toSession = (session: PrismaSession): ChatSession => ({
  id: session.id,
  userId: session.userId,
  title: session.title,
  createdAt: session.createdAt.toISOString(),
  updatedAt: session.updatedAt.toISOString(),
});

export const toMessage = (message: PrismaMessage): Message => ({
  id: message.id,
  sessionId: message.sessionId,
  role: message.role as MessageRole,
  content: message.content,
  toolCalls: (message.toolCalls as ToolCall[] | null) ?? null,
  createdAt: message.createdAt.toISOString(),
});
