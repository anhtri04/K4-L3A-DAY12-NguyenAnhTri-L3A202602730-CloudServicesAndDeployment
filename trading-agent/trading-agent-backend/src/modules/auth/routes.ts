import { Router } from "express";
import { z } from "zod";
import type { AuthResponse } from "@trading-agent/contracts";
import { asyncHandler, parseBody } from "../../lib/http";
import { requireAuth } from "../../middleware/auth";
import * as authService from "./service";

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const refreshBody = z.object({ refreshToken: z.string().min(1) });
const logoutBody = z.object({ refreshToken: z.string().min(1).optional() }).default({});

export const authRouter = Router();

authRouter.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const { email, password } = parseBody(credentials, req.body);
    const result: AuthResponse = await authService.signup(email, password);
    res.status(201).json(result);
  }),
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = parseBody(credentials, req.body);
    const result: AuthResponse = await authService.login(email, password);
    res.status(200).json(result);
  }),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = parseBody(refreshBody, req.body);
    const result: AuthResponse = await authService.refresh(refreshToken);
    res.status(200).json(result);
  }),
);

authRouter.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    const body = parseBody(logoutBody, req.body ?? {});
    await authService.logout(req.user!, body.refreshToken);
    res.status(204).send();
  }),
);
