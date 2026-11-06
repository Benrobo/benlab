import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5199,
    proxy: { "/api": "http://localhost:5200" },
    watch: { ignored: ["**/review/**", "**/.cache/**"] },
  },
});
