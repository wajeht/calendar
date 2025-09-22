import { describe, it, expect } from "vitest";
import { setupTestServer } from "../utils/test-utils.js";

describe("Main API", () => {
    const server = setupTestServer();

    describe("GET /", () => {
        it("should serve the index.html file", async () => {
            const response = await server.get("/");

            expect(response.status).toBe(200);
            expect(response.headers["content-type"]).toMatch(/text\/html/);
        });
    });

    describe("GET /healthz", () => {
        it("should return health status", async () => {
            const response = await server.get("/healthz");

            expect(response.status).toBe(200);
            expect(response.body.status).toMatch(/^(healthy|unhealthy)$/);
            expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            expect(response.body.uptime).toBeGreaterThan(0);
            expect(typeof response.body.uptime).toBe("number");
        });

        it("should include database health check", async () => {
            const response = await server.get("/healthz");

            expect(response.status).toBe(200);
            expect(response.body.database).toEqual({
                healthy: true
            });
        });
    });
});
