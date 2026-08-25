import { createApp } from "./app.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PORT = process.env.PORT || 3001;
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = createApp({ staticDir: path.join(rootDir, "dist") });

app.listen(PORT, () => {
  console.log(`No Stress running on http://localhost:${PORT}`);
});
