import { copyFile, access } from "node:fs/promises";

const envPath = new URL("../.env", import.meta.url);
const examplePath = new URL("../.env.example", import.meta.url);

try {
  await access(envPath);
  console.log("✓ .env already exists");
} catch {
  await copyFile(examplePath, envPath);
  console.log("✓ Created .env from .env.example");
}

console.log(`
Next:
  1. Put your ih_live_... key in .env (optional for demo mode)
  2. Run: npm run dev
  3. Open: http://localhost:5173
`);
