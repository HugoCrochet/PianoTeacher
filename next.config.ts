import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Toutes les pages sont privées et propres à l'utilisateur : pas de cache
  // de composants partagé (voir docs/ARCHITECTURE.md §2).
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
