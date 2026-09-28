import type { AuthResponse, User } from "@trading-agent/contracts";
import type { User as PrismaUser } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { conflict, unauthorized } from "../../lib/errors";
import { hashPassword, verifyPassword } from "../../lib/password";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type AccessTokenPayload,
} from "../../lib/jwt";
import {
  blacklistAccessToken,
  consumeRefreshToken,
  revokeAllRefreshTokens,
  storeRefreshToken,
} from "../../lib/tokens";

const toUser = (user: PrismaUser): User => ({
  id: user.id,
  email: user.email,
  createdAt: user.createdAt.toISOString(),
});

const issueTokens = async (user: PrismaUser): Promise<AuthResponse> => {
  const access = signAccessToken(user.id, user.email);
  const refresh = signRefreshToken(user.id);
  await storeRefreshToken(user.id, refresh.jti, refresh.token);

  return {
    user: toUser(user),
    tokens: {
      accessToken: access.token,
      refreshToken: refresh.token,
      expiresIn: access.expiresIn,
      tokenType: "Bearer",
    },
  };
};

export const signup = async (email: string, password: string): Promise<AuthResponse> => {
  const normalized = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) throw conflict("Email already registered");

  const user = await prisma.user.create({
    data: { email: normalized, passwordHash: await hashPassword(password) },
  });
  return issueTokens(user);
};

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) throw unauthorized("Invalid credentials");

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) throw unauthorized("Invalid credentials");

  return issueTokens(user);
};

export const refresh = async (token: string): Promise<AuthResponse> => {
  const payload = verifyRefreshToken(token);
  const consumed = await consumeRefreshToken(payload.sub, payload.jti, token);
  if (!consumed) {
    // Token is validly signed but unknown: treat as reuse and revoke the family.
    await revokeAllRefreshTokens(payload.sub);
    throw unauthorized("Refresh token is no longer valid");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw unauthorized("User no longer exists");

  return issueTokens(user);
};

export const logout = async (
  access: AccessTokenPayload,
  refreshToken?: string,
): Promise<void> => {
  const remaining = access.exp ? access.exp - Math.floor(Date.now() / 1000) : 0;
  await blacklistAccessToken(access.jti, remaining);

  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      await consumeRefreshToken(payload.sub, payload.jti, refreshToken);
    } catch {
      // A bad refresh token must not block logout.
    }
  }
};
