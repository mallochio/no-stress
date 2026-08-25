import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../server/app.js";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

describe("server app", () => {
  afterEach(() => {
    delete process.env.INTERHUMAN_API_KEY;
    vi.restoreAllMocks();
  });

  it("returns health", async () => {
    process.env.INTERHUMAN_API_KEY = "ih_live_test";
    const app = createApp();
    const response = await request(app).get("/api/health");
    expect(response.body).toEqual({ ok: true, hasApiKey: true });
  });

  it("returns 503 when api key missing", async () => {
    const app = createApp();
    const response = await request(app).post("/api/stream/session");
    expect(response.status).toBe(503);
  });

  it("mints client token when auth succeeds", async () => {
    process.env.INTERHUMAN_API_KEY = "ih_live_test";
    const authClient = {
      createClientToken: vi.fn(async () => ({ access_token: "minted-token" })),
    };
    const app = createApp({ authClient });
    const response = await request(app)
      .post("/api/stream/session")
      .set("Origin", "http://localhost:5173");
    expect(response.status).toBe(200);
    expect(response.body.token).toBe("minted-token");
    expect(authClient.createClientToken).toHaveBeenCalledWith(
      expect.objectContaining({ allowedOrigins: expect.arrayContaining(["http://localhost:5173"]) }),
    );
  });

  it("rejects token minting from an unknown browser origin", async () => {
    process.env.INTERHUMAN_API_KEY = "ih_live_test";
    const app = createApp({ authClient: { createClientToken: vi.fn() } });
    const response = await request(app)
      .post("/api/stream/session")
      .set("Origin", "https://evil.example");
    expect(response.status).toBe(403);
  });

  it("returns 500 when auth fails", async () => {
    process.env.INTERHUMAN_API_KEY = "ih_live_test";
    const authClient = {
      createClientToken: vi.fn(async () => {
        throw new Error("bad key");
      }),
    };
    const app = createApp({ authClient });
    const response = await request(app).post("/api/stream/session");
    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Token mint failed");
  });

  it("stringifies non-error auth failures", async () => {
    process.env.INTERHUMAN_API_KEY = "ih_live_test";
    const authClient = {
      createClientToken: vi.fn(async () => {
        throw "nope";
      }),
    };
    const app = createApp({ authClient });
    const response = await request(app).post("/api/stream/session");
    expect(response.body.detail).toBe("nope");
  });

  it("serves a built frontend in production mode", async () => {
    const staticDir = await mkdtemp(path.join(os.tmpdir(), "no-stress-"));
    await writeFile(path.join(staticDir, "index.html"), "<h1>No Stress</h1>");
    const app = createApp({ staticDir });
    const response = await request(app).get("/game");
    expect(response.status).toBe(200);
    expect(response.text).toContain("No Stress");
    await rm(staticDir, { recursive: true });
  });
});
