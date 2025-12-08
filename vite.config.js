import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { config } from "./src/config.js";
import tailwindcss from "@tailwindcss/vite";

const viteConfig = {
    plugins: [vue(), tailwindcss()],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src/vue", import.meta.url)),
        },
    },
    root: "./src/vue",
    publicDir: "./public",
    server: {
        port: config.app.vuePort,
        host: true,
        strictPort: true, // fail if 3000 is taken
        allowedHosts: ["localhost"],
        proxy: {
            "^/api/(?!.*\\.js$).*": {
                target: `http://localhost:${config.app.port}`,
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, "/api"),
            },
            "/healthz": {
                target: `http://localhost:${config.app.port}`,
                changeOrigin: true,
                rewrite: (path) => path,
            },
            "/favicon.ico": {
                target: `http://localhost:${config.app.port}`,
                changeOrigin: true,
                rewrite: (path) => path,
            },
        },
    },
    build: {
        outDir: "../../public",
        reportCompressedSize: true,
        chunkSizeWarningLimit: 500,
        emptyOutDir: false,
    },
};

export default defineConfig(({ mode }) => ({
    ...viteConfig,
    build: {
        ...viteConfig.build,
        rollupOptions: {
            output: {
                entryFileNames:
                    mode === "development" ? `assets/[name].js` : `assets/[name]-[hash].js`,
                chunkFileNames:
                    mode === "development" ? `assets/[name].js` : `assets/[name]-[hash].js`,
                assetFileNames:
                    mode === "development" ? `assets/[name].[ext]` : `assets/[name]-[hash].[ext]`,
                manualChunks: {
                    vendor: ["vue"],
                    fullcalendar: [
                        "@fullcalendar/core",
                        "@fullcalendar/vue3",
                        "@fullcalendar/daygrid",
                        "@fullcalendar/timegrid",
                        "@fullcalendar/list",
                        "@fullcalendar/interaction",
                        "@fullcalendar/icalendar",
                    ],
                },
            },
        },
    },
}));
