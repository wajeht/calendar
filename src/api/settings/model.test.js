import { describe, it, expect } from "vitest";
import { setupAuthenticatedTestServer } from "../../utils/test-utils.js";

describe("Settings Model", () => {
    const server = setupAuthenticatedTestServer();

    describe("get", () => {
        it("should get a setting by key", async () => {
            await server.ctx.models.settings.set("test_get_key", "test_value");

            const result = await server.ctx.models.settings.get("test_get_key");

            expect(result).toBe("test_value");
        });

        it("should return null for non-existent key", async () => {
            const result = await server.ctx.models.settings.get("non_existent_key");

            expect(result).toBeNull();
        });

        it("should parse JSON values", async () => {
            await server.ctx.models.settings.set("json_setting", { foo: "bar" });

            const result = await server.ctx.models.settings.get("json_setting");

            expect(result).toEqual({ foo: "bar" });
        });
    });

    describe("set", () => {
        it("should set a string value", async () => {
            await server.ctx.models.settings.set("string_key", "string_value");

            const result = await server.ctx.models.settings.get("string_key");

            expect(result).toBe("string_value");
        });

        it("should set an object value as JSON", async () => {
            await server.ctx.models.settings.set("object_key", { nested: { value: 123 } });

            const result = await server.ctx.models.settings.get("object_key");

            expect(result).toEqual({ nested: { value: 123 } });
        });

        it("should update existing key", async () => {
            await server.ctx.models.settings.set("update_key", "original");
            await server.ctx.models.settings.set("update_key", "updated");

            const result = await server.ctx.models.settings.get("update_key");

            expect(result).toBe("updated");
        });
    });

    describe("getMany", () => {
        it("should get multiple settings in a single query", async () => {
            await server.ctx.models.settings.set("many_key_1", "value1");
            await server.ctx.models.settings.set("many_key_2", "value2");
            await server.ctx.models.settings.set("many_key_3", "value3");

            const result = await server.ctx.models.settings.getMany([
                "many_key_1",
                "many_key_2",
                "many_key_3",
            ]);

            expect(result.many_key_1).toBe("value1");
            expect(result.many_key_2).toBe("value2");
            expect(result.many_key_3).toBe("value3");
        });

        it("should return empty object for non-existent keys", async () => {
            const result = await server.ctx.models.settings.getMany([
                "getmany_nonexistent_1",
                "getmany_nonexistent_2",
            ]);

            expect(result).toEqual({});
        });

        it("should return only existing keys", async () => {
            await server.ctx.models.settings.set("getmany_existing", "exists");

            const result = await server.ctx.models.settings.getMany([
                "getmany_existing",
                "getmany_missing",
            ]);

            expect(result.getmany_existing).toBe("exists");
            expect(result.getmany_missing).toBeUndefined();
        });

        it("should handle JSON values", async () => {
            await server.ctx.models.settings.set("getmany_json", { foo: "bar", num: 123 });
            await server.ctx.models.settings.set("getmany_array", [1, 2, 3]);

            const result = await server.ctx.models.settings.getMany([
                "getmany_json",
                "getmany_array",
            ]);

            expect(result.getmany_json).toEqual({ foo: "bar", num: 123 });
            expect(result.getmany_array).toEqual([1, 2, 3]);
        });

        it("should handle empty keys array", async () => {
            const result = await server.ctx.models.settings.getMany([]);

            expect(result).toEqual({});
        });
    });

    describe("getAll", () => {
        it("should get all settings", async () => {
            await server.ctx.models.settings.set("getall_key_1", "value1");
            await server.ctx.models.settings.set("getall_key_2", "value2");

            const result = await server.ctx.models.settings.getAll();

            expect(result.getall_key_1).toBe("value1");
            expect(result.getall_key_2).toBe("value2");
        });
    });

    describe("delete", () => {
        it("should delete a setting", async () => {
            await server.ctx.models.settings.set("delete_key", "to_delete");

            const deleted = await server.ctx.models.settings.delete("delete_key");
            const result = await server.ctx.models.settings.get("delete_key");

            expect(deleted).toBe(true);
            expect(result).toBeNull();
        });

        it("should return false for non-existent key", async () => {
            const deleted = await server.ctx.models.settings.delete("delete_nonexistent");

            expect(deleted).toBe(false);
        });
    });
});
