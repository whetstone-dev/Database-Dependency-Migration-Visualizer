import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    rolldownOptions: {
      onLog(level, log, handler) {
        // This is a client-only SPA. RSC directives have no semantics in this build.
        if (
          log.code === "MODULE_LEVEL_DIRECTIVE" &&
          log.message.includes("use client")
        )
          return;
        handler(level, log);
      },
    },
  },
});
