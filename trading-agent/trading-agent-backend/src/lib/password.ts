import bcrypt from "bcryptjs";
import { config } from "../config";

export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, config.BCRYPT_ROUNDS);

export const verifyPassword = (password: string, hash: string): Promise<boolean> =>
  bcrypt.compare(password, hash);
