import { describe, expect, it } from "vite-plus/test";
import { isPublicNetworkAddress } from "./network.js";

describe("isPublicNetworkAddress", () => {
    it.each([
        "0.0.0.0",
        "10.0.0.1",
        "100.64.0.1",
        "127.0.0.1",
        "169.254.169.254",
        "172.16.0.1",
        "192.168.1.1",
        "198.18.0.1",
        "224.0.0.1",
        "::",
        "::1",
        "::ffff:127.0.0.1",
        "fc00::1",
        "fe80::1",
        "ff00::1",
    ])("should reject non-public address %s", (address) => {
        expect(isPublicNetworkAddress(address)).toBe(false);
    });

    it.each(["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111"])(
        "should allow public address %s",
        (address) => {
            expect(isPublicNetworkAddress(address)).toBe(true);
        },
    );

    it("should reject invalid addresses", () => {
        expect(isPublicNetworkAddress("localhost")).toBe(false);
    });
});
