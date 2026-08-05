import { describe, expect, it } from "vite-plus/test";
import { formatLocalDate } from "./date.js";

describe("formatLocalDate", () => {
    it("should format calendar dates from local date parts", () => {
        const localDate = {
            getFullYear: () => 2026,
            getMonth: () => 7,
            getDate: () => 4,
            toISOString: () => "2026-08-05T04:30:00.000Z",
        };

        expect(formatLocalDate(localDate)).toBe("2026-08-04");
    });

    it("should pad single-digit months and days", () => {
        expect(formatLocalDate(new Date(2026, 0, 2))).toBe("2026-01-02");
    });
});
