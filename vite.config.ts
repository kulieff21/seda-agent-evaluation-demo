import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/seda-agent-evaluation-demo/",
  plugins: [react()],
  build: { modulePreload: { polyfill: false } },
  server: { host: "127.0.0.1" },
  preview: { host: "127.0.0.1" },
});
