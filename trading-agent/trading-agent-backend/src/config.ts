import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  ACCESS_TOKEN_TTL: z.coerce.number().default(900),
  REFRESH_TOKEN_TTL: z.coerce.number().default(604800),
  BCRYPT_ROUNDS: z.coerce.number().default(10),
  CHAT_CONTEXT_LIMIT: z.coerce.number().default(20),
});

export const config = schema.parse(process.env);
export type Config = typeof config;
