import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative paths work on the GitHub Pages project subpath and local previews.
  base: "./",
});
