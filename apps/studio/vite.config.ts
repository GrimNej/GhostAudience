import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  const isTest = mode === "test";

  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(isTest
        ? []
        : [
            cloudflare(),
            VitePWA({
              registerType: "prompt",
              injectRegister: "auto",
              manifest: {
                name: "Ghost Audience",
                short_name: "Ghost Audience",
                description:
                  "A no-hindsight audience-question debugger for narrative scripts.",
                theme_color: "#0c0d10",
                background_color: "#0c0d10",
                display: "standalone",
                start_url: "/",
                icons: [
                  {
                    src: "/favicon.svg",
                    sizes: "any",
                    type: "image/svg+xml",
                    purpose: "any",
                  },
                ],
              },
              workbox: {
                navigateFallback: "/index.html",
                globPatterns: ["**/*.{js,css,html,svg,woff2,json}"],
                runtimeCaching: [
                  {
                    urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
                    handler: "NetworkOnly",
                  },
                ],
              },
            }),
          ]),
    ],
    build: {
      target: "es2023",
      sourcemap: true,
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks(moduleId) {
            if (moduleId.includes("node_modules/react")) {
              return "react";
            }
            if (
              moduleId.includes("node_modules/xstate") ||
              moduleId.includes("node_modules/@xstate") ||
              moduleId.includes("node_modules/@tanstack/react-query")
            ) {
              return "state";
            }
            if (moduleId.includes("node_modules/dexie")) {
              return "storage";
            }
            return undefined;
          },
        },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./tests/setup.ts"],
      coverage: {
        provider: "v8",
        reporter: ["text", "json-summary", "html"],
        thresholds: {
          lines: 85,
          functions: 85,
          statements: 85,
          branches: 80,
        },
      },
    },
  };
});
