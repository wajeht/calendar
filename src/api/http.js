import { serveStatic } from "@hono/node-server/serve-static";

const publicIndex = serveStatic({ path: "./public/index.html" });

export function parseByteLimit(value, fallback = 1024 * 1024) {
    if (typeof value === "number") return value;
    if (typeof value !== "string") return fallback;

    const match = value
        .trim()
        .toLowerCase()
        .match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)?$/);
    if (!match) return fallback;

    const amount = Number(match[1]);
    const unit = match[2] || "b";
    const multipliers = {
        b: 1,
        kb: 1024,
        mb: 1024 * 1024,
        gb: 1024 * 1024 * 1024,
    };

    return Math.floor(amount * multipliers[unit]);
}

export function toCookieOptions(options = {}) {
    const { maxAge, sameSite, ...rest } = options;

    return {
        ...rest,
        ...(maxAge !== undefined && { maxAge: Math.ceil(maxAge / 1000) }),
        ...(sameSite && {
            sameSite: sameSite.charAt(0).toUpperCase() + sameSite.slice(1).toLowerCase(),
        }),
    };
}

export function requestPath(c) {
    const url = new URL(c.req.url);
    return `${url.pathname}${url.search}`;
}

export function servePublicIndex(c) {
    return publicIndex(c, async () => c.text("Not Found", 404));
}

export function htmlError(c, title, error, statusCode) {
    return c.html(
        `<!doctype html><html><head><title>${title}</title></head><body><h1>${title}</h1><p>${error}</p></body></html>`,
        statusCode,
    );
}
