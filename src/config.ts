export const config = {
  APP_ENV: Bun.env.APP_ENV || 'development' as 'development' | 'production',
  APP_PORT: Bun.env.APP_PORT || 80,
  APP_DATABASE_PATH: Bun.env.APP_DATABASE_PATH || 'calendars.db',
  APP_PASSWORD: Bun.env.APP_PASSWORD || 'password',
}
