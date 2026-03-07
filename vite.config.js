import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
export default defineConfig({
  assetsInclude: ["**/*.webm"],
  plugins: [
    vue()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
    },
  },
});
