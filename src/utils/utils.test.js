import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { createUtils } from "./utils.js";
import { createLogger } from "./logger.js";
import { ConfigurationError, ValidationError } from "../errors.js";

function makeUtils(cap) {
    return createUtils({
        logger: createLogger("test"),
        config: {
            app: { env: "production" },
            auth: {
                sessionSecret: "test-session-secret",
                idleTimeout: 7 * 24 * 60 * 60 * 1000,
                absoluteTimeout: 30 * 24 * 60 * 60 * 1000,
            },
            cap,
        },
        errors: { ConfigurationError, ValidationError },
    });
}

describe("utils.isCapEnabled", () => {
    const cap = { siteKey: "site", secret: "secret", apiUrl: "https://cap.example.test" };

    it("is enabled in production with a site key and secret", () => {
        expect(makeUtils(cap).isCapEnabled()).toBe(true);
    });

    it("is disabled when the site key or secret is missing", () => {
        expect(makeUtils({ ...cap, siteKey: "" }).isCapEnabled()).toBe(false);
        expect(makeUtils({ ...cap, secret: "" }).isCapEnabled()).toBe(false);
    });

    it("is disabled outside production", () => {
        const utils = createUtils({
            logger: createLogger("test"),
            config: {
                app: { env: "development" },
                auth: {
                    sessionSecret: "test-session-secret",
                    idleTimeout: 7 * 24 * 60 * 60 * 1000,
                    absoluteTimeout: 30 * 24 * 60 * 60 * 1000,
                },
                cap,
            },
            errors: { ConfigurationError, ValidationError },
        });
        expect(utils.isCapEnabled()).toBe(false);
    });
});

describe("utils.verifyCapToken", () => {
    const utils = makeUtils({ secret: "test-secret", apiUrl: "https://cap.example.test" });
    let originalFetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it("posts the secret and token to the cap siteverify endpoint", async () => {
        let captured;
        globalThis.fetch = async (url, options) => {
            captured = { url, options };
            return { json: async () => ({ success: true }) };
        };

        const outcome = await utils.verifyCapToken("token-123");

        expect(outcome.success).toBe(true);
        expect(captured.url).toBe("https://cap.example.test/siteverify");
        expect(captured.options.method).toBe("POST");
        expect(JSON.parse(captured.options.body)).toEqual({
            secret: "test-secret",
            response: "token-123",
        });
    });

    it("returns the failure outcome from the cap server", async () => {
        globalThis.fetch = async () => ({ json: async () => ({ success: false }) });

        const outcome = await utils.verifyCapToken("bad-token");

        expect(outcome.success).toBe(false);
    });

    it("throws a ConfigurationError when the cap server is unreachable", async () => {
        globalThis.fetch = async () => {
            throw new Error("network down");
        };

        await expect(utils.verifyCapToken("token")).rejects.toThrow(/Failed to verify Cap token/);
    });
});

describe("utils session signing", () => {
    const DAY = 24 * 60 * 60 * 1000;
    const utils = makeUtils({ secret: "test-secret", apiUrl: "https://cap.example.test" });

    it("accepts a generated session with signed activity", () => {
        const token = utils.createSessionToken(Date.now() - DAY);
        const activity = utils.createSessionActivity(token);

        expect(utils.validateSessionToken(token, activity)).toBe(true);
    });

    it("rejects a token with a forged signature", () => {
        const token = utils.createSessionToken();
        const parts = token.split(".");
        parts[2] = "0".repeat(64);
        const forgedToken = parts.join(".");
        const activity = utils.createSessionActivity(forgedToken);

        expect(utils.validateSessionToken(forgedToken, activity)).toBe(false);
    });

    it("rejects unsigned activity timestamps", () => {
        const token = utils.createSessionToken();

        expect(utils.validateSessionToken(token, String(Date.now()))).toBe(false);
    });
});
