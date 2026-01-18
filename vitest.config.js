import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        env: {
            NODE_ENV: "test",
            APP_ENV: "test",
            APP_PORT: "80",
            APP_VUE_PORT: "3000",
            PRODUCTION_SSH_URL: "calendar@420.247.0.365",
            SESSION_SECRET: "your-session-secret-change-in-production",
        },
        testTimeout: 10000,
        hookTimeout: 10000,
        teardownTimeout: 10000,
    },
});
