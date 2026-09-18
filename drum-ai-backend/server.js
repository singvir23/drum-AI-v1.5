// Local development server: `npm start` (reads .env if present).
import { readFileSync } from "node:fs";
import app from "./api/index.js";

try {
  for (const line of readFileSync(new URL("./.env", import.meta.url), "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  // no .env — fine, the plugin sends the key
}

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => console.log(`drum-ai-backend listening on http://localhost:${port}`));
