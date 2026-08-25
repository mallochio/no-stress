import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.js"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.js", "server/app.js"],
      exclude: [
        "src/main.js",
        "src/games/types.js",
        "server/index.js",
        "src/games/flappy.js",
        "src/games/dino.js",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
