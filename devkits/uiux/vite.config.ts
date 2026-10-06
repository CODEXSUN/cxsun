import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: "../../dist/devkits/uiux"
  },
  cacheDir: "../../node_modules/.vite/uiux",
  plugins: [tailwindcss(), react()],
  server: {
    host: "127.0.0.1",
    port: 7030
  }
});
