import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// Use environment variables directly since Vite runs in Node.js
const APP_VUE_PORT = parseInt(process.env.APP_VUE_PORT) || 3000;
const APP_PORT = parseInt(process.env.APP_PORT) || 80;

const viteConfig = {
    plugins: [vue()],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src/vue", import.meta.url)),
        },
    },
    root: "./src/vue",
    publicDir: "./public",
    server: {
        port: APP_VUE_PORT,
        host: true,
        strictPort: true, // fail if 3000 is taken
        allowedHosts: ["localhost"],
        proxy: {
            "^/api/(?!.*\\.js$).*": {
                target: `http://localhost:${APP_PORT}`,
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, "/api"),
            },
            "/healthz": {
                target: `http://localhost:${APP_PORT}`,
                changeOrigin: true,
                rewrite: (path) => path,
            },
            "/favicon.ico": {
                target: `http://localhost:${APP_PORT}`,
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
