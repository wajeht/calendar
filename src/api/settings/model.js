export function createSettings(dependencies = {}) {
    const { db, errors } = dependencies;

    if (!errors) throw new Error("Errors required for settings model");
    const { ConfigurationError } = errors;

    if (!db) throw new ConfigurationError("Database required for settings model");

    const { DatabaseError } = errors;

    return {
        /**
         * Get a setting value by key
         * @param {string} key - The setting key
         * @returns {Promise<any>} The setting value (parsed from JSON if applicable)
         */
        async get(key) {
            try {
                const setting = await db("settings").where("key", key).first();

                if (!setting) {
                    return null;
                }

                try {
                    return JSON.parse(setting.value);
                } catch {
                    return setting.value;
                }
            } catch (error) {
                throw new DatabaseError(`Failed to get setting ${key}: ${error.message}`, error, {
                    cause: error,
                });
            }
        },

        /**
         * Set a setting value
         * @param {string} key - The setting key
         * @param {any} value - The setting value (will be JSON stringified if object)
         * @returns {Promise<void>}
         */
        async set(key, value) {
            try {
                const serializedValue =
                    typeof value === "object" ? JSON.stringify(value) : String(value);

                await db("settings")
                    .insert({
                        key,
                        value: serializedValue,
                        created_at: new Date(),
                        updated_at: new Date(),
                    })
                    .onConflict("key")
                    .merge({
                        value: serializedValue,
                        updated_at: new Date(),
                    });
            } catch (error) {
                throw new DatabaseError(`Failed to set setting ${key}: ${error.message}`, error, {
                    cause: error,
                });
            }
        },

        /**
         * Get all settings
         * @returns {Promise<Object>} Object with all settings
         */
        async getAll() {
            try {
                const settings = await db("settings").select("key", "value");
                const result = {};

                for (const setting of settings) {
                    try {
                        result[setting.key] = JSON.parse(setting.value);
                    } catch {
                        result[setting.key] = setting.value;
                    }
                }

                return result;
            } catch (error) {
                throw new DatabaseError(`Failed to get all settings: ${error.message}`, error, {
                    cause: error,
                });
            }
        },

        /**
         * Delete a setting
         * @param {string} key - The setting key
         * @returns {Promise<boolean>} True if setting was deleted
         */
        async delete(key) {
            try {
                const deletedCount = await db("settings").where("key", key).del();
                return deletedCount > 0;
            } catch (error) {
                throw new DatabaseError(
                    `Failed to delete setting ${key}: ${error.message}`,
                    error,
                    { cause: error },
                );
            }
        },
    };
}
