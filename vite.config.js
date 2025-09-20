import { fileURLToPath, URL } from "node:url";

import { config } from './src/config.js'
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";

const viteConfig = {
    plugins: [vue(), vueDevTools()],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src/vue", import.meta.url)),
        },
    },
    root: "./src/vue",
    publicDir: './public',
    server: {
        port: 3000,
        host: true,
        strictPort: true,
        allowedHosts: ['localhost'],
        proxy: {
            '/api': {
                target: 'http://localhost',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, '/api'),
            },
            '/healthz': {
                target: 'http://localhost',
                changeOrigin: true,
                rewrite: (path) => path,
            },
            '/favicon.ico': {
                target: 'http://localhost',
                changeOrigin: true,
                rewrite: (path) => path,
            },
        },
    },
    build: {
        outDir: '../../public',
        reportCompressedSize: true,
        chunkSizeWarningLimit: 1600,
        emptyOutDir: false,
        rollupOptions: {
            output: {
                entryFileNames: `assets/[name].js`,
                chunkFileNames: `assets/[name].js`,
                assetFileNames: `assets/[name].[ext]`,
            },
        },
    },
}

if (config.app.env === 'development') {
    delete viteConfig.build.rollupOptions;
}

export default defineConfig(viteConfig);
