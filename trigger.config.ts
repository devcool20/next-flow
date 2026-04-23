import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_mkyixeqfxmsdbouyvdmj",
  runtime: "node",
  maxDuration: 300,
  logLevel: "info",
  dirs: ["./src/trigger"],
  build: {
    // @ts-ignore - Bypass local type check to allow Vercel build to pass while cloud worker gets the pkgs
    image: {
      pkgs: ["ffmpeg"],
    },
  },
});
