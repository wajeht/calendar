import { styleText } from "node:util";
import { inspect } from "node:util";

export function createLogger(config = {}) {
    const { level = "info" } = config;

    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[level] ?? 1;

    const shouldLog = (logLevel) => levels[logLevel] >= currentLevel;

    const getTimestamp = () => {
        return new Date().toISOString();
    };

    const formatArgs = (args) => {
        return args.length > 0
            ? " " + args.map((arg) => (typeof arg === "string" ? arg : inspect(arg))).join(" ")
            : "";
    };

    return {
        info: (message, ...args) => {
            if (shouldLog("info")) {
                process.stdout.write(
                    styleText("cyan", `[${getTimestamp()}] ℹ️  ${message}`) +
                        formatArgs(args) +
                        "\n",
                );
            }
        },
        error: (message, ...args) => {
            if (shouldLog("error")) {
                process.stderr.write(
                    styleText("red", `[${getTimestamp()}] ❌ ${message}`) + formatArgs(args) + "\n",
                );
            }
        },
        success: (message, ...args) => {
            if (shouldLog("info")) {
                process.stdout.write(
                    styleText("green", `[${getTimestamp()}] ✅ ${message}`) +
                        formatArgs(args) +
                        "\n",
                );
            }
        },
        warn: (message, ...args) => {
            if (shouldLog("warn")) {
                process.stdout.write(
                    styleText("yellow", `[${getTimestamp()}] ⚠️  ${message}`) +
                        formatArgs(args) +
                        "\n",
                );
            }
        },
        debug: (message, ...args) => {
            if (shouldLog("debug")) {
                process.stdout.write(
                    styleText("magenta", `[${getTimestamp()}] 🐛 ${message}`) +
                        formatArgs(args) +
                        "\n",
                );
            }
        },
    };
}
