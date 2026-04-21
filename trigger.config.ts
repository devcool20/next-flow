import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "next-flow",
  runtime: "node",
  maxDuration: 300,
  logLevel: "info",
  dirs: ["./src/trigger"],
});
