import type { ToolDefinition } from "@trading-agent/contracts";

/**
 * Tool registry for the agent. Intentionally empty for the MVP: the agent
 * only echoes. Add OpenAI-compatible function definitions here and wire them
 * in `runAgent` when tools land.
 */
export const tools: ToolDefinition[] = [];
