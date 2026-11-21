const fs = require("node:fs");
const path = require("node:path");

const envPath = path.resolve(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  if (typeof process.loadEnvFile !== "function") {
    throw new Error("Node.js with process.loadEnvFile support is required to load Neon variables.");
  }
  process.loadEnvFile(envPath);
}
