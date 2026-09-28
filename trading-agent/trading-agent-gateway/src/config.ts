import "dotenv/config";
import { z } from "zod";

const csv = (value: string): string[] =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(8080),
  BACKEND_URL: z.string().url(),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  ALLOWED_ORIGINS: z.string().default("http://localhost:5173").transform(csv),
  /** Allow requests without an Origin header (server-to-server, curl, health checks). */
  ALLOW_MISSING_ORIGIN: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().default(100),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(5),
  RATE_LIMIT_CHAT_MAX: z.coerce.number().default(20),
});

export const config = schema.parse(process.env);
export type Config = typeof config;
