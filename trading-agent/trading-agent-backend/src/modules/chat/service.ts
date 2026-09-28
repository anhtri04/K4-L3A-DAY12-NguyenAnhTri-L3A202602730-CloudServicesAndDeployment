import type { AgentRunInput, ChatResponse, SessionId } from "@trading-agent/contracts";
import { Prisma } from "@prisma/client";
import { config } from "../../config";
import { prisma } from "../../lib/prisma";
import { toMessage } from "../../lib/mappers";
import { runAgent, tools } from "../../agent";
import { createSession, getOwnedSession } from "../sessions/service";

const titleFromMessage = (message: string): string => {
  const clean = message.replace(/\s+/g, " ").trim();
  return clean.length > 60 ? `${clean.slice(0, 57)}...` : clean || "New chat";
};

export const chat = async (
  userId: string,
  input: { sessionId?: SessionId; message: string },
): Promise<ChatResponse> => {
  const session = input.sessionId
    ? await getOwnedSession(userId, input.sessionId)
    : await createSession(userId, titleFromMessage(input.message));

  await prisma.message.create({
    data: { sessionId: session.id, role: "user", content: input.message },
  });

  const context = await prisma.message.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "desc" },
    take: config.CHAT_CONTEXT_LIMIT,
  });

  const messages: AgentRunInput["messages"] = context.reverse().map((m) => ({
    role: m.role as AgentRunInput["messages"][number]["role"],
    content: m.content,
    toolCalls: m.toolCalls as AgentRunInput["messages"][number]["toolCalls"],
  }));

  const agentResult = await runAgent({ messages, tools });

  const assistantMessage = await prisma.message.create({
    data: {
      sessionId: session.id,
      role: "assistant",
      content: agentResult.content,
      toolCalls:
        agentResult.toolCalls.length > 0
          ? (agentResult.toolCalls as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
    },
  });

  await prisma.chatSession.update({
    where: { id: session.id },
    data: { updatedAt: new Date() },
  });

  return { sessionId: session.id, message: toMessage(assistantMessage) };
};
