import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        env: {
            NODE_ENV: "test",
            APP_ENV: "test",
            APP_PORT: "80",
            APP_VUE_PORT: "3000",
            SESSION_SECRET: "your-session-secret-change-in-production",
        },
        testTimeout: 10000,
        hookTimeout: 10000,
        teardownTimeout: 10000,
    },
});
