import { styleText } from "node:util";

export function createLogger(config = {}) {
    const { level = "info" } = config;

    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[level] ?? 1;

    const shouldLog = (logLevel) => levels[logLevel] >= currentLevel;

    return {
        info: (message, ...args) => {
            if (shouldLog("info")) {
                console.log(styleText("cyan", `ℹ️  ${message}`), ...args);
            }
        },
        error: (message, ...args) => {
            if (shouldLog("error")) {
                console.error(styleText("red", `❌ ${message}`), ...args);
            }
        },
        success: (message, ...args) => {
            if (shouldLog("info")) {
                console.log(styleText("green", `✅ ${message}`), ...args);
            }
        },
        warn: (message, ...args) => {
            if (shouldLog("warn")) {
                console.warn(styleText("yellow", `⚠️  ${message}`), ...args);
            }
        },
        debug: (message, ...args) => {
            if (shouldLog("debug")) {
                console.log(styleText("magenta", `🐛 ${message}`), ...args);
            }
        }
    };
}

