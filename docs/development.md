# 🛠️ Development Guide

## Prerequisites

- **Node.js** 18+
- **npm** or **yarn**
- **SQLite3** (for database)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/wajeht/calendar.git
cd calendar

# Install dependencies
npm install

# Set up database
npm run db:migrate:latest

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

## 🏗️ Project Structure

```
src/
├── api/                    # Hono API routes
│   ├── auth/              # Authentication routes & middleware
│   ├── calendar/          # Calendar CRUD & iCal processing
│   └── settings/          # App configuration routes
├── db/                    # Database layer
│   ├── migrations/        # Knex.js migrations
│   └── sqlite/           # SQLite database files
├── vue/                   # Vue.js frontend
│   ├── components/        # Reusable UI components
│   ├── composables/       # Vue composition functions
│   ├── pages/            # Page components
│   └── router.js         # Vue Router config
├── utils/                 # Shared utilities
├── app.js                # Hono app setup
├── server.js             # Server entry point
├── cron.js               # Background sync jobs
└── config.js             # App configuration
```

## 🔧 Available Scripts

### Development

```bash
npm run dev              # Start both Vue & Hono in watch mode
npm run dev:server       # Start only Hono server with --watch
npm run dev:vue          # Start only Vite dev server
npm run dev:serve        # Build Vue & watch + start Hono
```

### Production

```bash
npm run build            # Build Vue.js for production
npm start                # Start production server
```

### Database

```bash
npm run db:migrate:latest    # Run latest migrations
npm run db:migrate:rollback  # Rollback last migration
npm run db:migrate:make      # Create new migration
npm run db:reset:password    # Reset app password
```

### Testing

```bash
npm test                 # Run tests once
npm run test:watch       # Run tests in watch mode
```

### Linting & Formatting

```bash
npm run lint:check       # Check for lint issues
npm run lint             # Fix lint issues
npm run format:check     # Check formatting
npm run format           # Fix formatting
```

### Utilities

```bash
npm run rmds            # Remove .DS_Store files
```

## 🗄️ Database

Uses **SQLite** with **Knex.js** for migrations and query building.

**Key tables:**

- `calendars` - Calendar sources and settings
- `settings` - App configuration (passwords, cron settings)

**Migration workflow:**

```bash
# Create new migration
npm run db:migrate:make add_new_feature

# Edit migration file in src/db/migrations/
# Run migration
npm run db:migrate:latest
```

## 🎨 Frontend Development

**Tech Stack:**

- **Vue.js 3** with Composition API
- **Vue Router** for routing
- **Tailwind CSS** for styling
- **FullCalendar.js** for calendar UI
- **Vite** for build tooling

**Key patterns:**

- Use composables for shared logic (`useAuth`, `useCalendar`, `useSettings`)
- Components follow Vue 3 `<script setup>` syntax
- API calls centralized in `src/vue/api.js`
- Reactive state management with `ref()` and `reactive()`

## 🔙 Backend Development

**Tech Stack:**

- **Hono** with ES modules
- **Better-SQLite3** for database
- **ICAL.js** for calendar parsing
- **node-cron** for background sync
- **Hono built-in security, compression, body limit, ETag, logger, context storage, pretty JSON, and CORS middleware**
- **hono-rate-limiter** for Hono-native rate limiting

**Key patterns:**

- Dependency injection for services and models
- Custom error classes with proper HTTP status codes
- Middleware for authentication and validation
- Service layer for business logic

## 🧪 Testing

Tests use **Vitest** and Hono's `app.request()` testing API:

```bash
# Run specific test file
npm test auth.test.js

# Test with coverage
npm test -- --coverage
```

**Test structure:**

- API route tests in `src/api/**/*.test.js`
- Test utilities in `src/utils/test-utils.js`
- Tests use in-memory SQLite database

## 🔍 Debugging

**Server-side:**

```bash
# Debug mode with inspect
node --inspect --watch ./src/server.js

# Environment variables
DEBUG=calendar:* npm run dev
```

**Client-side:**

- Vue DevTools browser extension
- Console logs in development mode
- Network tab for API debugging

## 🚀 Deployment

**Build process:**

```bash
npm run build           # Build frontend assets
npm run db:prepare:prod # Run production migrations
npm start              # Start production server
```

**Environment variables:**

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=./src/db/sqlite/db.sqlite
APP_SECRET=your-session-secret
```

## 📦 Adding Dependencies

**Frontend dependencies:**

```bash
npm install package-name
# Import in Vue components or main.js
```

**Backend dependencies:**

```bash
npm install package-name
# Import in Node.js files
```

**Development dependencies:**

```bash
npm install -D package-name
```

## 🔧 Configuration

**Key config files:**

- `package.json` - Scripts and dependencies
- `vite.config.js` - Frontend build config
- `src/config.js` - App configuration
- `src/db/knexfile.js` - Database config
- `tailwind.config.js` - CSS framework config

## 🐛 Common Issues

**Database locked:**

```bash
# Stop all processes and restart
npm run dev
```

**Port already in use:**

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill
```

**Build errors:**

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Calendar not fetching:**

- Check CORS settings for iCal URLs
- Verify URL returns valid iCal format
- Check server logs for fetch errors
