import type { ChatSession, Message } from "@trading-agent/contracts";
import { prisma } from "../../lib/prisma";
import { notFound } from "../../lib/errors";
import { toMessage, toSession } from "../../lib/mappers";

export const createSession = async (userId: string, title?: string): Promise<ChatSession> => {
  const session = await prisma.chatSession.create({
    data: { userId, title: title?.trim() || "New chat" },
  });
  return toSession(session);
};

export const listSessions = async (userId: string): Promise<ChatSession[]> => {
  const sessions = await prisma.chatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return sessions.map(toSession);
};

export const getOwnedSession = async (
  userId: string,
  sessionId: string,
): Promise<ChatSession> => {
  const session = await prisma.chatSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw notFound("Chat session not found");
  return toSession(session);
};

export const deleteSession = async (userId: string, sessionId: string): Promise<void> => {
  await getOwnedSession(userId, sessionId);
  await prisma.chatSession.delete({ where: { id: sessionId } });
};

export interface HistoryPage {
  messages: Message[];
  nextCursor: string | null;
}

export const listHistory = async (
  userId: string,
  sessionId: string,
  limit: number,
  cursor?: string,
): Promise<HistoryPage> => {
  await getOwnedSession(userId, sessionId);

  let before: Date | undefined;
  if (cursor) {
    const anchor = await prisma.message.findFirst({
      where: { id: cursor, sessionId },
      select: { createdAt: true },
    });
    before = anchor?.createdAt;
  }

  const where = before ? { sessionId, createdAt: { lt: before } } : { sessionId };
  const rows = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const ordered = rows.reverse().map(toMessage);
  return {
    messages: ordered,
    nextCursor: rows.length === limit ? ordered[0]?.id ?? null : null,
  };
};
