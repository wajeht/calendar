/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    const setting = await knex("settings").where("key", "cron_settings").first();

    if (setting) {
        try {
            const cronSettings = JSON.parse(setting.value);

            if (cronSettings.schedule === "0 * * * *") {
                cronSettings.schedule = "0 */1 * * *";

                await knex("settings")
                    .where("key", "cron_settings")
                    .update({
                        value: JSON.stringify(cronSettings),
                        updated_at: new Date(),
                    });

                console.log("✓ Updated cron schedule format from '0 * * * *' to '0 */1 * * *'");
            }
        } catch (error) {
            console.error("Failed to update cron settings:", error.message);
        }
    }
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    const setting = await knex("settings").where("key", "cron_settings").first();

    if (setting) {
        try {
            const cronSettings = JSON.parse(setting.value);

            if (cronSettings.schedule === "0 */1 * * *") {
                cronSettings.schedule = "0 * * * *";

                await knex("settings")
                    .where("key", "cron_settings")
                    .update({
                        value: JSON.stringify(cronSettings),
                        updated_at: new Date(),
                    });

                console.log("✓ Reverted cron schedule format from '0 */1 * * *' to '0 * * * *'");
            }
        } catch (error) {
            console.error("Failed to revert cron settings:", error.message);
        }
    }
}
