import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const apiProxy = {
  "/api": {
    target: "http://127.0.0.1:8000",
    changeOrigin: true,
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    // Akses dari perangkat lain harus diaktifkan secara eksplisit dengan
    // npm run dev -- --host 0.0.0.0 agar server tidak terbuka tanpa sengaja.
    host: "127.0.0.1",
    port: 8080,
    strictPort: true,
    proxy: apiProxy,
  },
  preview: {
    host: "127.0.0.1",
    port: 8080,
    strictPort: true,
    proxy: apiProxy,
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
