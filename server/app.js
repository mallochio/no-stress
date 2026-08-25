import { AuthClient } from "@interhumanai/sdk";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { existsSync } from "node:fs";
import path from "node:path";

dotenv.config();

/**
 * @param {{ authClient?: AuthClient; staticDir?: string; allowedOrigins?: string[] }} [deps]
 */
export function createApp(deps = {}) {
  const auth = deps.authClient ?? new AuthClient();
  const app = express();
  const configuredOrigins = (process.env.APP_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = new Set(
    deps.allowedOrigins ?? [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3001",
      "http://127.0.0.1:3001",
      ...configuredOrigins,
    ],
  );

  app.use(
    cors({
      origin(origin, callback) {
        callback(null, !origin || allowedOrigins.has(origin));
      },
    }),
  );
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, hasApiKey: Boolean(process.env.INTERHUMAN_API_KEY) });
  });

  app.post("/api/stream/session", async (req, res) => {
    const apiKey = process.env.INTERHUMAN_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: "INTERHUMAN_API_KEY is not configured" });
      return;
    }

    const origin = req.headers.origin;
    if (origin && !allowedOrigins.has(origin)) {
      res.status(403).json({ error: "Origin is not allowed. Add it to APP_ORIGIN." });
      return;
    }

    try {
      const token = await auth.createClientToken({
        apiKey,
        scopes: ["interhumanai.stream"],
        expiresIn: 600,
        maxDurationSeconds: 900,
        maxVideoSeconds: 900,
        allowedOrigins: [...allowedOrigins],
      });

      res.json({ token: token.access_token });
    } catch (error) {
      res.status(500).json({
        error: "Token mint failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  });

  if (deps.staticDir && existsSync(deps.staticDir)) {
    app.use(express.static(deps.staticDir));
    app.get("*", (_req, res) => res.sendFile(path.join(deps.staticDir, "index.html")));
  }

  return app;
}
