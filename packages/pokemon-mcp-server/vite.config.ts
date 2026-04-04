import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(__dirname, "ui"),
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: path.resolve(__dirname, "dist/ui"),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "ui/mcp-app.html"),
    },
  },
});
