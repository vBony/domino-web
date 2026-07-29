import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Vite resolve os path aliases (@engine, @scenes, ...) a partir do tsconfig.json
// via vite-tsconfig-paths, para nao duplicar a config de aliases em dois lugares.
export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    target: "es2022",
    sourcemap: true
  }
});
