import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { config } from "../config";
import { unauthorized } from "./errors";

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  email: string;
  type: "access";
  jti: string;
}

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  type: "refresh";
  jti: string;
}

export const signAccessToken = (
  userId: string,
  email: string,
): { token: string; jti: string; expiresIn: number } => {
  const jti = randomUUID();
  const token = jwt.sign({ sub: userId, email, type: "access" }, config.JWT_ACCESS_SECRET, {
    jwtid: jti,
    expiresIn: config.ACCESS_TOKEN_TTL,
  } satisfies SignOptions);
  return { token, jti, expiresIn: config.ACCESS_TOKEN_TTL };
};

export const signRefreshToken = (userId: string): { token: string; jti: string } => {
  const jti = randomUUID();
  const token = jwt.sign({ sub: userId, type: "refresh" }, config.JWT_REFRESH_SECRET, {
    jwtid: jti,
    expiresIn: config.REFRESH_TOKEN_TTL,
  } satisfies SignOptions);
  return { token, jti };
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as AccessTokenPayload;
    if (payload.type !== "access") throw new Error("wrong token type");
    return payload;
  } catch {
    throw unauthorized("Invalid or expired access token");
  }
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    const payload = jwt.verify(token, config.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    if (payload.type !== "refresh") throw new Error("wrong token type");
    return payload;
  } catch {
    throw unauthorized("Invalid or expired refresh token");
  }
};
