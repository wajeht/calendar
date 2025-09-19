const DEBUG = true;

const log = {
    getTimestamp: () => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, "0");
        const seconds = now.getSeconds().toString().padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";
        const hour12 = hours % 12 || 12;
        return `${hour12}:${minutes}:${seconds} ${ampm}`;
    },
    debug: (...args) => {
        if (DEBUG) {
            console.log(`[${log.getTimestamp()}] [DEBUG]`, ...args);
        }
    },
    error: (...args) => {
        if (DEBUG) {
            console.error(`[${log.getTimestamp()}] [ERROR]`, ...args);
        }
    },
    info: (...args) => {
        if (DEBUG) {
            console.log(`[${log.getTimestamp()}] [INFO]`, ...args);
        }
    },
    public: (...args) => {
        if (DEBUG) {
            console.log(`[${log.getTimestamp()}] [PUBLIC]`, ...args);
        }
    },
};

const utils = {
    formatDate: (date, allDay = false) => {
        if (!date) return "N/A";
        return date.toLocaleString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: allDay ? undefined : "2-digit",
            minute: allDay ? undefined : "2-digit",
        });
    },

    getRandomColor: () => {
        const colors = [
            "#2196F3",
            "#4CAF50",
            "#FF9800",
            "#9C27B0",
            "#F44336",
            "#00BCD4",
            "#795548",
            "#607D8B",
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    },
};

window.log = log;
window.utils = utils;

log.info("Global utilities loaded");
