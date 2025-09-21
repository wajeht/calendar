/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
    return knex.schema
        .createTable("calendars", function (table) {
            table.increments("id").primary();
            table.text("name").notNullable().defaultTo("");
            table.text("url").notNullable().unique();
            table.text("color").notNullable().defaultTo("#447dfc");
            table.boolean("hidden").notNullable().defaultTo(false);
            table.boolean("details").notNullable().defaultTo(false);
            table.text("data");
            table.text("events");
            table.text("events_public");
            table.text("events_authenticated");
            table.timestamps(true, true);

            table.index("url");
            table.index("hidden");
            table.index("created_at");
            table.index("updated_at");
        })
        .createTable("settings", (table) => {
            table.string("key").primary();
            table.text("value");
            table.timestamp("created_at").defaultTo(knex.fn.now());
            table.timestamp("updated_at").defaultTo(knex.fn.now());

            table.index("created_at");
            table.index("updated_at");
        });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
    return knex.schema.dropTableIfExists("settings").dropTableIfExists("calendars");
}
