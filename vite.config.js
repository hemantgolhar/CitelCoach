import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  base: "/CitelCoach/",
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      scope: "/CitelCoach/",
      includeAssets: ["icon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "CitelCoach",
        short_name: "CitelCoach",
        description: "Your Personal Sales Coach",
        theme_color: "#101714",
        background_color: "#101714",
        display: "standalone",
        start_url: "/CitelCoach/",
        scope: "/CitelCoach/",
        icons: [
          { src: "/CitelCoach/icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "/CitelCoach/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/CitelCoach/index.html",
        navigateFallbackAllowlist: [/^\/CitelCoach\//],
      },
    }),
  ],
});
