import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 8080,
    strictPort: true,
  },
  plugins: [react()],
  build: {
    // Lightning CSS menggabungkan aturan produksi lebih rapat daripada minifier
    // bawaan, sehingga CSS awal tetap ringan tanpa mengubah class atau desain.
    cssMinify: "lightningcss",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
