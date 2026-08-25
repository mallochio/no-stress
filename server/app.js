import { AuthClient } from "@interhumanai/sdk";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

/**
 * @param {{ authClient?: AuthClient }} [deps]
 */
export function createApp(deps = {}) {
  const auth = deps.authClient ?? new AuthClient();
  const app = express();

  app.use(cors());
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

    const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, "") || "http://localhost:5173";
    const allowedOrigins = [origin, "http://localhost:5173", "http://127.0.0.1:5173"];

    try {
      const token = await auth.createClientToken({
        apiKey,
        scopes: ["interhumanai.stream"],
        expiresIn: 600,
        maxDurationSeconds: 900,
        maxVideoSeconds: 900,
        allowedOrigins: [...new Set(allowedOrigins.filter(Boolean))],
      });

      res.json({ token: token.access_token });
    } catch (error) {
      res.status(500).json({
        error: "Token mint failed",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return app;
}
