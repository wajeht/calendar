// Bun provides path as a global
const __filename = import.meta.url;
const __dirname = import.meta.dir || new URL(".", import.meta.url).pathname;

const knexConfig = {
    client: "sqlite3",
    useNullAsDefault: true,
    asyncStackTraces: false,
    connection: {
        filename: `${__dirname}/sqlite/db.sqlite`,
    },
    migrations: {
        tableName: "knex_migrations",
        directory: `${__dirname}/migrations`,
    },
    seeds: { directory: `${__dirname}/seeds` },
    pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000, // 30 seconds
        createTimeoutMillis: 30000, // 30 seconds
        idleTimeoutMillis: 600000, // 10 minutes
        destroyTimeoutMillis: 5000, // 5 seconds
        reapIntervalMillis: 1000, // 1 second
        afterCreate: (conn, done) => {
            try {
                // Enable foreign key constraints
                conn.run("PRAGMA foreign_keys = ON");

                // Use Write-Ahead Logging for better concurrency
                conn.run("PRAGMA journal_mode = WAL");

                // Set synchronous mode to NORMAL for better performance
                conn.run("PRAGMA synchronous = NORMAL");

                // Adjusts the number of pages in the memory cache
                conn.run("PRAGMA cache_size = 10000");

                // Stores temp objects in memory
                conn.run("PRAGMA temp_store = MEMORY");

                // Wait for 5000 ms before timing out
                conn.run("PRAGMA busy_timeout = 5000");

                done();
            } catch (err) {
                done(err);
            }
        },
    },
};

if (Bun.env.APP_ENV === "test") {
    console.log("🧪 Using in-memory database for tests");
    knexConfig.connection = { filename: ":memory:" };
}

export default knexConfig;
