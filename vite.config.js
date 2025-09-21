import { fileURLToPath, URL } from "node:url";

import { config } from "./src/config.js";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
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
        port: 3000,
        host: true,
        strictPort: true,
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
        chunkSizeWarningLimit: 1600,
        emptyOutDir: false,
    },
};

export default defineConfig(({ mode }) => ({
    ...viteConfig,
    build: {
        ...viteConfig.build,
        rollupOptions: {
            output:
                mode === "development"
                    ? {
                          entryFileNames: `assets/[name].js`,
                          chunkFileNames: `assets/[name].js`,
                          assetFileNames: `assets/[name].[ext]`,
                      }
                    : {
                          entryFileNames: `assets/[name]-[hash].js`,
                          chunkFileNames: `assets/[name]-[hash].js`,
                          assetFileNames: `assets/[name]-[hash].[ext]`,
                      },
        },
    },
}));
