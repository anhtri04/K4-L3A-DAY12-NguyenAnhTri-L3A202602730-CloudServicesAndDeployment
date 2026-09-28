import type { ServerResponse } from "node:http";
import { createProxyMiddleware } from "http-proxy-middleware";
import { config } from "./config";

/**
 * Single proxy hop to the backend. The gateway never parses bodies, so
 * request streams pass through untouched. Identity is carried by the
 * Authorization header (re-verified by the backend), never by injected
 * user headers. `x-request-id` is forwarded from the incoming headers.
 */
export const proxy = createProxyMiddleware({
  target: config.BACKEND_URL,
  changeOrigin: true,
  xfwd: true,
  proxyTimeout: 30_000,
  on: {
    error: (err, _req, res) => {
      // eslint-disable-next-line no-console
      console.error("[gateway] upstream proxy error:", err.message);
      const response = res as ServerResponse;
      if (typeof response.writeHead === "function" && !response.headersSent) {
        response.writeHead(502, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            error: { code: "INTERNAL", message: "Upstream service unavailable" },
          }),
        );
      }
    },
  },
});
