import { createServer, closeServer } from "./app.js";

async function gracefulShutdown(signal, serverInfo) {
    console.log(`Received ${signal}, shutting down gracefully.`);

    setTimeout(() => {
        console.error("Could not close connections in time, forcefully shutting down");
        process.exit(1);
    }, 10000).unref();

    try {
        await closeServer(serverInfo);
        process.exit(0);
    } catch (error) {
        console.error(`Error during shutdown: ${error.message}`);
        process.exit(1);
    }
}

function handleWarning(warning) {
    console.warn(`Process warning: ${warning.name} - ${warning.message}`);
}

function handleUncaughtException(error, origin) {
    console.error(`Uncaught Exception: ${error.message}, Origin: ${origin}`);
    process.exit(1);
}

function handleUnhandledRejection(reason, _promise) {
    if (reason instanceof Error) {
        console.error(`Unhandled Rejection: ${reason.message}`);
    } else {
        console.error(`Unhandled Rejection: ${reason}`);
    }
    process.exit(1);
}

async function main() {
    const serverInfo = await createServer();
    process.title = "calendar";

    process.on("SIGINT", gracefulShutdown("SIGINT", serverInfo));
    process.on("SIGTERM", gracefulShutdown("SIGTERM", serverInfo));
    process.on("SIGQUIT", gracefulShutdown("SIGQUIT", serverInfo));

    process.on("warning", handleWarning);
    process.on("uncaughtException", handleUncaughtException);
    process.on("unhandledRejection", handleUnhandledRejection);
}

main().catch(function (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
});
