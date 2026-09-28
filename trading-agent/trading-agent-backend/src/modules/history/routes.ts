import { Router } from "express";
import type { HistoryResponse } from "@trading-agent/contracts";
import { asyncHandler } from "../../lib/http";
import { badRequest } from "../../lib/errors";
import { requireAuth } from "../../middleware/auth";
import { listHistory } from "../sessions/service";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export const historyRouter = Router();
historyRouter.use(requireAuth);

historyRouter.get(
  "/history",
  asyncHandler(async (req, res) => {
    const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : "";
    if (!sessionId) throw badRequest("sessionId is required");

    const limitParam = Number(req.query.limit ?? DEFAULT_LIMIT);
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(1, limitParam), MAX_LIMIT)
      : DEFAULT_LIMIT;
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;

    const page = await listHistory(req.user!.sub, sessionId, limit, cursor);
    const body: HistoryResponse = page;
    res.status(200).json(body);
  }),
);
