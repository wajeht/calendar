const DEBUG = import.meta.env.DEV;

export function useLogger(prefix = "") {
    const formatPrefix = prefix ? `[${prefix}]` : "";

    return {
        log: (...args) => DEBUG && console.log(formatPrefix, ...args),
        info: (...args) => DEBUG && console.info(formatPrefix, ...args),
        warn: (...args) => DEBUG && console.warn(formatPrefix, ...args),
        error: (...args) => console.error(formatPrefix, ...args), // Always show errors
    };
}
