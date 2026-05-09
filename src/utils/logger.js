import { styleText } from "node:util";
import { AsyncLocalStorage } from "async_hooks";
import { tryGetContext } from "hono/context-storage";

const store = new AsyncLocalStorage();
const levelColors = { debug: "magenta", info: "cyan", warn: "yellow", error: "red" };

export function createLogger(service = "app") {
    const honoContext = () => {
        try {
            return tryGetContext();
        } catch {
            return undefined;
        }
    };

    const honoLogContext = () => {
        const context = honoContext();
        if (!context) return {};

        return {
            request_id: context.get("requestId"),
            method: context.req.method,
            path: context.req.path,
            ...context.get("logContext"),
        };
    };

    const ctx = () => ({
        ...store.getStore(),
        ...honoLogContext(),
    });

    const set = (data) => {
        const context = honoContext();
        if (context) {
            context.set("logContext", {
                ...context.get("logContext"),
                ...data,
            });
            return;
        }

        const stored = store.getStore();
        if (stored) Object.assign(stored, data);
    };

    const withContext = (data, fn) => store.run({ ...ctx(), ...data }, fn);

    const log = (level, msg, data = {}) => {
        if (process.env?.LOG_LEVEL === "silent") return;
        const output = JSON.stringify({
            ts: new Date().toISOString(),
            level,
            service,
            msg,
            ...ctx(),
            ...data,
        });
        process.stdout.write(styleText(levelColors[level] || "white", output) + "\n");
    };

    return {
        set,
        withContext,
        info: (msg, data) => log("info", msg, data),
        warn: (msg, data) => log("warn", msg, data),
        error: (msg, data) => log("error", msg, data),
        debug: (msg, data) => log("debug", msg, data),
    };
}
