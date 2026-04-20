import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "next-flow",
  runtime: "node",
  logLevel: "info",
  dirs: ["./src/trigger"],
});
