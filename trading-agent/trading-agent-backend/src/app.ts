import express from "express";
import { errorHandler, notFoundHandler, requestId } from "./middleware/error";
import { authRouter } from "./modules/auth/routes";
import { chatRouter } from "./modules/chat/routes";
import { historyRouter } from "./modules/history/routes";
import { sessionsRouter } from "./modules/sessions/routes";

export const createApp = () => {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", true);
  app.use(express.json({ limit: "1mb" }));
  app.use(requestId);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "backend" });
  });

  app.use(authRouter);
  app.use(chatRouter);
  app.use(sessionsRouter);
  app.use(historyRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
