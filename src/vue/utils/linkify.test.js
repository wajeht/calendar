import { describe, expect, it } from "vite-plus/test";
import { getSafeHttpUrl, linkifyText } from "./linkify.js";

describe("linkifyText", () => {
    it("returns untrusted markup as plain text", () => {
        expect(linkifyText('<img src=x onerror="alert(1)">')).toEqual([
            { text: "<img" },
            { text: " " },
            { text: "src=x" },
            { text: " " },
            { text: 'onerror="alert(1)">' },
        ]);
    });

    it("creates safe links for supported contact types", () => {
        expect(linkifyText("user@example.com +1-555-123-4567 https://example.com/test.")).toEqual([
            { text: "user@example.com", href: "mailto:user@example.com" },
            { text: " " },
            { text: "+1-555-123-4567", href: "tel:+15551234567" },
            { text: " " },
            {
                text: "https://example.com/test",
                href: "https://example.com/test",
                external: true,
            },
            { text: "." },
        ]);
    });
});

describe("getSafeHttpUrl", () => {
    it("allows HTTP URLs", () => {
        expect(getSafeHttpUrl("https://example.com/event")).toBe("https://example.com/event");
    });

    it("rejects executable and malformed URLs", () => {
        expect(getSafeHttpUrl("javascript:alert(1)")).toBe("");
        expect(getSafeHttpUrl("data:text/html,test")).toBe("");
        expect(getSafeHttpUrl("not a url")).toBe("");
    });
});
