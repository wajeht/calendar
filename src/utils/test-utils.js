import { beforeAll, afterAll } from "vite-plus/test";

const emptyCalendarIcs = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Empty Calendar//EN
END:VCALENDAR`;

export async function createTestServer() {
    process.env.NODE_ENV = "test";
    process.env.LOG_LEVEL = "silent";
    global.fetch = async () => ({
        ok: true,
        text: async () => emptyCalendarIcs,
        headers: { get: () => "text/calendar" },
    });
    const { createApp } = await import("../app.js");
    const { app, ctx } = await createApp();

    await ctx.db.migrate.latest();

    const hashedPassword = await ctx.utils.hashPassword("test-password");
    await ctx.models.settings.set("app_password", hashedPassword);

    let sessionToken = null;
    const cookieJar = new Map();

    function serializeCookies() {
        return Array.from(cookieJar.entries())
            .map(([name, value]) => `${name}=${value}`)
            .join("; ");
    }

    function storeCookies(setCookies = []) {
        for (const cookie of setCookies) {
            const [nameValue, ...attributes] = cookie.split(";");
            const [name, ...valueParts] = nameValue.split("=");
            const value = valueParts.join("=");
            const normalizedAttributes = attributes.map((attr) => attr.trim().toLowerCase());
            const isExpired = normalizedAttributes.some(
                (attr) =>
                    attr === "max-age=0" ||
                    attr.startsWith("expires=thu, 01 jan 1970") ||
                    attr.startsWith("expires=thu, 1 jan 1970"),
            );

            if (isExpired || value === "") {
                cookieJar.delete(name);
            } else {
                cookieJar.set(name, value);
            }
        }
    }

    async function toTestResponse(response) {
        const setCookies = response.headers.getSetCookie?.() || [];
        storeCookies(setCookies);

        const headers = {};
        response.headers.forEach((value, key) => {
            headers[key] = value;
        });
        if (setCookies.length > 0) {
            headers["set-cookie"] = setCookies;
        }

        const text = await response.text();
        const contentType = response.headers.get("content-type") || "";
        let body = {};

        if (contentType.includes("application/json") && text) {
            body = JSON.parse(text);
        }

        return {
            status: response.status,
            headers,
            body,
            text,
        };
    }

    async function executeRequest(method, path, body = null, options = {}) {
        const headers = new Headers(options.headers || options);
        const requestMethod = method.toUpperCase();
        let requestBody;

        if (body !== null && body !== undefined) {
            headers.set("content-type", "application/json");
            requestBody = JSON.stringify(body);
        }

        if (requestMethod !== "GET" && requestMethod !== "HEAD" && !headers.has("sec-fetch-site")) {
            headers.set("sec-fetch-site", "same-origin");
        }

        if (cookieJar.size > 0 && !headers.has("cookie")) {
            headers.set("cookie", serializeCookies());
        }

        const response = await app.request(path, {
            method: requestMethod,
            headers,
            body: requestBody,
        });

        return toTestResponse(response);
    }

    async function login(password = null) {
        const response = await executeRequest("post", "/api/auth", {
            password: password || "test-password",
        });

        if (response.status !== 200) {
            throw new Error(`Login failed: ${response.status}`);
        }

        const cookies = response.headers["set-cookie"];
        if (cookies) {
            const sessionMatch = cookies.join(";").match(/session_token=([^;]+)/);
            sessionToken = sessionMatch ? sessionMatch[1] : null;
        }

        return sessionToken;
    }

    async function logout() {
        await executeRequest("post", "/api/auth/logout");
        sessionToken = null;
    }

    async function cleanDatabase() {
        await ctx.db("calendars").del();
    }

    async function stop() {
        if (ctx.db && typeof ctx.db.destroy === "function") {
            await ctx.db.destroy();
        }
    }

    return {
        ctx: {
            db: ctx.db,
            models: ctx.models,
            utils: ctx.utils,
            logger: ctx.logger,
            errors: ctx.errors,
            ICAL: ctx.ICAL,
        },
        login,
        logout,
        cleanDatabase,
        stop,
        get: (path, options = {}) => executeRequest("get", path, null, options),
        post: (path, body = null, options = {}) => executeRequest("post", path, body, options),
        put: (path, body = null, options = {}) => executeRequest("put", path, body, options),
        delete: (path, options = {}) => executeRequest("delete", path, null, options),
        request: (method, path, options = {}) => executeRequest(method, path, null, options),
    };
}

export async function setupAuthenticatedServer() {
    const testServer = await createTestServer();
    await testServer.login();
    return testServer;
}

export function setupTestServer() {
    let testServer;

    beforeAll(async () => {
        testServer = await createTestServer();
    });

    afterAll(async () => {
        if (testServer) {
            await testServer.stop();
        }
    });

    return new Proxy(
        {},
        {
            get(_target, prop) {
                if (!testServer) {
                    throw new Error(
                        "Test server not initialized. Make sure setupTestServer() is called within a describe block.",
                    );
                }
                return testServer[prop];
            },
        },
    );
}

export function setupAuthenticatedTestServer() {
    let testServer;

    beforeAll(async () => {
        testServer = await setupAuthenticatedServer();
        await testServer.cleanDatabase();
    });

    afterAll(async () => {
        if (testServer) {
            await testServer.stop();
        }
    });

    return new Proxy(
        {},
        {
            get(_target, prop) {
                if (!testServer) {
                    throw new Error(
                        "Test server not initialized. Make sure setupAuthenticatedTestServer() is called within a describe block.",
                    );
                }
                return testServer[prop];
            },
        },
    );
}
