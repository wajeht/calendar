import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { createUtils } from "./utils.js";
import { createLogger } from "./logger.js";
import { ConfigurationError, ValidationError } from "../errors.js";

describe("utils.verifyCapToken", () => {
    const config = {
        cap: { apiUrl: "https://cap.example.test", secret: "test-secret" },
    };
    const utils = createUtils({
        logger: createLogger("test"),
        config,
        errors: { ConfigurationError, ValidationError },
    });

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

    it("throws when the cap server reports failure", async () => {
        globalThis.fetch = async () => ({ json: async () => ({ success: false }) });

        await expect(utils.verifyCapToken("bad-token")).rejects.toThrow(/Cap validation failed/);
    });

    it("throws when the cap request errors", async () => {
        globalThis.fetch = async () => {
            throw new Error("network down");
        };

        await expect(utils.verifyCapToken("token")).rejects.toThrow(/Failed to verify Cap token/);
    });
});
