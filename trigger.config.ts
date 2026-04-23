import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_mkyixeqfxmsdbouyvdmj",
  runtime: "node",
  maxDuration: 300,
  logLevel: "info",
  dirs: ["./src/trigger"],
  build: {
    extensions: [
      {
        name: "ffmpeg",
        onBuild: (context) => {
          context.addInstructions({
            type: "run",
            command: "apt-get update && apt-get install -y ffmpeg",
          });
        },
      },
    ],
  },
});
