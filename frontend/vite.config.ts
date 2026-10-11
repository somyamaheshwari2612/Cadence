// TanStack Start Vite configuration for Cadence:
// Includes devtools, tanstackStart, viteReact, tsConfigPaths, nitro SSR, and alias mapping.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: {
    preset: process.env["VERCEL"] ? "vercel" : "cloudflare-module",
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
