# 🗓️ Calendar

A web-based calendar application with multiple calendar source support via iCal/WebCal URLs.

## Installation

```sh
bun install
```

## Development

```sh
bun run dev
APP_PORT=80 bun run dev # or with custom port
```

Open http://localhost:80

## Features

- ✅ Support for multiple calendars (Google Calendar, Apple Calendar, Outlook, etc.)
- ✅ iCal/WebCal URL support
- ✅ Persistent calendar storage (SQLite)
- ✅ Color-coded calendars
- ✅ Event details modal
- ✅ Week/Month/Day/List views
- ✅ WebSocket support for live view synchronization
- ✅ Docker deployment ready

## Environment Variables

- `APP_PORT` - Server port (default: 80)
- `APP_ENV` - Environment mode: 'development' or 'production'
- `APP_DATABASE_PATH` - SQLite database path (default: calendars.db)
- `APP_PASSWORD` - Password for the app (default: password)

## WebSocket Support

The app includes WebSocket support for live view synchronization. When deployed with CapRover or other reverse proxies, ensure your nginx configuration includes a dedicated `/ws` location block with proper WebSocket headers.

## API Endpoints

- `GET /api/calendars` - List all calendars
- `POST /api/calendars` - Add a new calendar
- `DELETE /api/calendars/:id` - Remove a calendar
- `GET /api/calendar/view` - Get current view
- `POST /api/calendar/view` - Change calendar view
- `GET /healthz` - Health check endpoint

## Deployment

Built with Bun and ready for Docker/CapRover deployment. WebSocket works on `/ws` endpoint with proper nginx configuration.
