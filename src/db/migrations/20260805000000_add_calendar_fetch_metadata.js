/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
    return knex.schema.alterTable("calendars", (table) => {
        table.text("source_etag");
        table.text("source_last_modified");
        table.text("source_url");
        table.boolean("event_views_stale").notNullable().defaultTo(true);
    });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
    return knex.schema.alterTable("calendars", (table) => {
        table.dropColumns("source_etag", "source_last_modified", "source_url", "event_views_stale");
    });
}
