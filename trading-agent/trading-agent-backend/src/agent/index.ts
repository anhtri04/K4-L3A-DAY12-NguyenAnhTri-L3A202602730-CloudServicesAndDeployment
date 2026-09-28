import type { AgentRunInput, AgentRunResult } from "@trading-agent/contracts";
import { tools } from "./tools";

export { tools };

/**
 * The MVP agent: no LLM, no tools, just echoes the latest user turn verbatim.
 *
 * This is the single seam that will be replaced by a real provider (e.g. an
 * OpenAI-compatible chat completions call with `tools`). Keep the signature
 * stable so the chat service never has to change when the agent is upgraded.
 */
export const runAgent = async (input: AgentRunInput): Promise<AgentRunResult> => {
  const lastUserMessage = [...input.messages].reverse().find((m) => m.role === "user");
  return { content: lastUserMessage?.content ?? "", toolCalls: [] };
};
