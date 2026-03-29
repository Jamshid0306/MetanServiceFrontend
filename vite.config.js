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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            /TelegramLoginButton\.vue/.test(id) ||
            /[/\\]pages[/\\]LoginPage\.vue/.test(id) ||
            /[/\\]pages[/\\]RegisterPage\.vue/.test(id) ||
            /[/\\]pages[/\\]ForgotPasswordPage\.vue/.test(id)
          ) {
            return "auth-flow";
          }
        },
      },
    },
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
