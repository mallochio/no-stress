#!/usr/bin/env node
/**
 * Stack smoke test — run with: npm run test:stack
 * Set INTERHUMAN_API_KEY in .env or environment for live token mint test.
 */
import dotenv from "dotenv";

dotenv.config();

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3001";

/** @type {{ name: string; ok: boolean; detail?: string }[]} */
const results = [];

/**
 * @param {string} name
 * @param {() => Promise<void>} fn
 */
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({
      name,
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

await check("health endpoint", async () => {
  const response = await fetch(`${BASE}/api/health`);
  const body = await response.json();
  if (!body.ok) {
    throw new Error(JSON.stringify(body));
  }
});

await check("token mint", async () => {
  const response = await fetch(`${BASE}/api/stream/session`, { method: "POST" });
  if (process.env.INTERHUMAN_API_KEY) {
    if (!response.ok) {
      throw new Error(`expected 200, got ${response.status}: ${await response.text()}`);
    }
    const body = await response.json();
    if (!body.token || typeof body.token !== "string") {
      throw new Error("missing token in response");
    }
    return;
  }

  if (response.status !== 503) {
    throw new Error(`expected 503, got ${response.status}`);
  }
});

await check("vite frontend (if running)", async () => {
  const vite = process.env.VITE_URL ?? "http://localhost:5173";
  try {
    const response = await fetch(vite);
    const html = await response.text();
    if (!html.includes("FACE CURSE GAMES")) {
      throw new Error("home page title missing");
    }
  } catch (error) {
    if (error instanceof TypeError) {
      results.push({ name: "vite frontend (if running)", ok: true, detail: "skipped — vite not running" });
      return;
    }
    throw error;
  }
});

const failed = results.filter((result) => !result.ok);
console.log(JSON.stringify({ passed: failed.length === 0, results }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
