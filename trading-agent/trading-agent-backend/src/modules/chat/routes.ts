import { Router } from "express";
import { z } from "zod";
import { asyncHandler, parseBody } from "../../lib/http";
import { requireAuth } from "../../middleware/auth";
import { chat } from "./service";

const chatBody = z.object({
  sessionId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(8000),
});

export const chatRouter = Router();
chatRouter.use(requireAuth);

chatRouter.post(
  "/chat",
  asyncHandler(async (req, res) => {
    const body = parseBody(chatBody, req.body);
    const result = await chat(req.user!.sub, body);
    res.status(200).json(result);
  }),
);
