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

    async function executeRequest(method, path, body = null, customHeaders = new Headers()) {
        const headers = new Headers(customHeaders);
        let requestBody;

        if (body !== null && body !== undefined) {
            headers.set("content-type", "application/json");
            requestBody = JSON.stringify(body);
        }

        if (cookieJar.size > 0 && !headers.has("cookie")) {
            headers.set("cookie", serializeCookies());
        }

        const response = await app.request(path, {
            method: method.toUpperCase(),
            headers,
            body: requestBody,
        });

        return toTestResponse(response);
    }

    function requestBuilder(method, path) {
        const headers = new Headers();

        return {
            set(name, value) {
                headers.set(name, value);
                return executeRequest(method, path, null, headers);
            },
        };
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
        get: (path) => executeRequest("get", path),
        post: (path, body = null) => executeRequest("post", path, body),
        put: (path, body = null) => executeRequest("put", path, body),
        delete: (path) => executeRequest("delete", path),
        request: (method, path) => requestBuilder(method, path),
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
