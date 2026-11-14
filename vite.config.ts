import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  worker: {
    format: "es"
  },
  optimizeDeps: {
    exclude: ["@elah/core", "mediabunny"]
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("/node_modules/")) return;
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) return "react-vendor";
          if (id.includes("/@supabase/")) return "supabase-vendor";
          if (id.includes("/@huggingface/") || id.includes("/onnxruntime-web/")) return "ai-runtime";
          if (id.includes("/@elah/") || id.includes("/mediabunny/")) return "elah-media-engine";
        }
      }
    }
  }
});
