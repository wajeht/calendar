/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('calendars', function(table) {
    table.increments('id').primary();
    table.text('name').notNullable().defaultTo('');
    table.text('url').notNullable().unique();
    table.text('color').notNullable().defaultTo('#447dfc');
    table.boolean('hidden').notNullable().defaultTo(false);
    table.boolean('details').notNullable().defaultTo(false);
    table.text('data');
    table.text('events');
    table.timestamps(true, true);
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTableIfExists('calendars');
}
