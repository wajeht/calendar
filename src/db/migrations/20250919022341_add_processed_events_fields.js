/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
    return knex.schema.alterTable("calendars", function (table) {
        table.text("events_public").after("events");
        table.text("events_authenticated").after("events_public");
    });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
    return knex.schema.alterTable("calendars", function (table) {
        table.dropColumn("events_public");
        table.dropColumn("events_authenticated");
    });
}
