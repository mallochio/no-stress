import { AuthClient } from "@interhumanai/sdk";
import dotenv from "dotenv";
import { access } from "node:fs/promises";

dotenv.config();

const checks = [];
const major = Number(process.versions.node.split(".")[0]);
checks.push({
  name: "Node.js 20+",
  ok: major >= 20,
  detail: process.version,
});

try {
  await access(new URL("../node_modules", import.meta.url));
  checks.push({ name: "Dependencies installed", ok: true });
} catch {
  checks.push({ name: "Dependencies installed", ok: false, detail: "Run npm install" });
}

const apiKey = process.env.INTERHUMAN_API_KEY;
const hasRealKey = Boolean(apiKey?.startsWith("ih_live_"));
checks.push({
  name: "Interhuman key",
  ok: true,
  detail: hasRealKey ? "configured" : "not configured — demo mode will be used",
});

if (process.argv.includes("--live")) {
  if (!hasRealKey) {
    checks.push({ name: "Live token mint", ok: false, detail: "Set INTERHUMAN_API_KEY first" });
  } else {
    try {
      const auth = new AuthClient();
      const token = await auth.createClientToken({
        apiKey,
        scopes: ["interhumanai.stream"],
        expiresIn: 60,
        maxDurationSeconds: 60,
        maxVideoSeconds: 60,
        allowedOrigins: ["http://localhost:5173"],
      });
      checks.push({ name: "Live token mint", ok: Boolean(token.access_token) });
    } catch (error) {
      checks.push({
        name: "Live token mint",
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

for (const check of checks) {
  console.log(`${check.ok ? "✓" : "✗"} ${check.name}${check.detail ? ` — ${check.detail}` : ""}`);
}

if (checks.some((check) => !check.ok)) {
  process.exitCode = 1;
}
