import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { api } from "./api.js";

describe("calendar API", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        global.window = { location: { origin: "http://localhost" } };
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("should allow manual refresh requests to run beyond the default timeout", async () => {
        let requestSignal;
        global.fetch = vi.fn((_url, options) => {
            requestSignal = options.signal;
            return new Promise((_resolve, reject) => {
                requestSignal.addEventListener("abort", () => reject(requestSignal.reason), {
                    once: true,
                });
            });
        });

        const refresh = api.calendar.refresh();
        const refreshError = refresh.catch((error) => error);

        await vi.advanceTimersByTimeAsync(15_000);
        expect(requestSignal.aborted).toBe(false);

        await vi.advanceTimersByTimeAsync(105_000);
        expect(requestSignal.aborted).toBe(true);
        expect((await refreshError).name).toBe("AbortError");
    });
});
