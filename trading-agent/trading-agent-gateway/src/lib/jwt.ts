import jwt, { type JwtPayload } from "jsonwebtoken";
import { config } from "../config";
import { unauthorized } from "./errors";

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  email: string;
  type: "access";
  jti: string;
}

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as AccessTokenPayload;
    if (payload.type !== "access") throw new Error("wrong token type");
    return payload;
  } catch {
    throw unauthorized("Invalid or expired access token");
  }
};
