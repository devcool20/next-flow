import { defineConfig } from "@trigger.dev/sdk/v3";
import { ffmpeg } from "@trigger.dev/build/extensions/core";

const projectRef = process.env.TRIGGER_PROJECT_REF ?? "proj_mkyixeqfxmsdbouyvdmj";

export default defineConfig({
  project: projectRef,
  runtime: "node",
  maxDuration: 300,
  logLevel: "info",
  dirs: ["./src/trigger"],
  build: {
    extensions: [ffmpeg()],
  },
});
