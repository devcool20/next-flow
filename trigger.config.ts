import { defineConfig } from "@trigger.dev/sdk/v3";
import { ffmpeg } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: "proj_mkyixeqfxmsdbouyvdmj",
  runtime: "node",
  maxDuration: 300,
  logLevel: "info",
  dirs: ["./src/trigger"],
  build: {
    extensions: [ffmpeg()],
  },
});
