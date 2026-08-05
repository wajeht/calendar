import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { createApp } from "./app.js";

describe("static cache policy", () => {
    let app;
    let ctx;
    let previousLogLevel;

    beforeAll(async () => {
        previousLogLevel = process.env.LOG_LEVEL;
        process.env.LOG_LEVEL = "silent";
        ({ app, ctx } = await createApp({
            app: { env: "production" },
        }));
    });

    afterAll(async () => {
        await ctx.db.destroy();
        if (previousLogLevel === undefined) delete process.env.LOG_LEVEL;
        else process.env.LOG_LEVEL = previousLogLevel;
    });

    it("should require index revalidation", async () => {
        const response = await request(app).get("/").set("x-forwarded-proto", "https");

        expect(response.status).toBe(200);
        expect(response.headers["cache-control"]).toBe("no-cache");
    });

    it("should cache versioned assets immutably", async () => {
        const response = await request(app)
            .get("/assets/Button-QGs7_sTG.css")
            .set("x-forwarded-proto", "https");

        expect(response.status).toBe(200);
        expect(response.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    });

    it("should revalidate unversioned static files", async () => {
        const response = await request(app).get("/favicon.ico").set("x-forwarded-proto", "https");

        expect(response.status).toBe(200);
        expect(response.headers["cache-control"]).not.toContain("immutable");
    });
});
