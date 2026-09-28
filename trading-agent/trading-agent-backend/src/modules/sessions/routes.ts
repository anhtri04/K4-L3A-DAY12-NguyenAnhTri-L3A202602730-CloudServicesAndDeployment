import { Router } from "express";
import { z } from "zod";
import type { ListSessionsResponse } from "@trading-agent/contracts";
import { asyncHandler, parseBody } from "../../lib/http";
import { requireAuth } from "../../middleware/auth";
import * as sessions from "./service";

const createBody = z.object({ title: z.string().trim().max(120).optional() }).default({});

export const sessionsRouter = Router();
sessionsRouter.use(requireAuth);

sessionsRouter.post(
  "/chatsession",
  asyncHandler(async (req, res) => {
    const { title } = parseBody(createBody, req.body ?? {});
    const session = await sessions.createSession(req.user!.sub, title);
    res.status(201).json(session);
  }),
);

sessionsRouter.get(
  "/chatsession",
  asyncHandler(async (req, res) => {
    const body: ListSessionsResponse = {
      sessions: await sessions.listSessions(req.user!.sub),
    };
    res.status(200).json(body);
  }),
);

sessionsRouter.get(
  "/chatsession/:id",
  asyncHandler(async (req, res) => {
    const session = await sessions.getOwnedSession(req.user!.sub, req.params.id);
    res.status(200).json(session);
  }),
);

sessionsRouter.delete(
  "/chatsession/:id",
  asyncHandler(async (req, res) => {
    await sessions.deleteSession(req.user!.sub, req.params.id);
    res.status(204).send();
  }),
);
