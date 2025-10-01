/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
    return knex.schema.table("calendars", function (table) {
        table.boolean("enable_notifications").notNullable().defaultTo(false);
        table.index("enable_notifications");
    });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
    return knex.schema.table("calendars", function (table) {
        table.dropColumn("enable_notifications");
    });
}
