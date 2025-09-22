# 🗓️ Calendar

[![Node.js CI](https://github.com/wajeht/calendar/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/wajeht/calendar/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Open Source Love svg1](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/wajeht/calendar)

A web-based calendar application with multiple calendar source support via iCal/WebCal URLs.

# 📖 How It Works

This calendar app fetches iCal data from external sources and displays events with different access levels.

```
📝 Add Calendar
name + color + iCal URL → stored in database
    ↓
🕐 Cron Job Fetches Data
iCal URL → ICAL.js parser → 3 versions stored:
├─ Raw iCal data
├─ Full events (titles, attendees, descriptions, locations)
└─ Stripped events (time slots only)
```

**Access Control:**
```
🌍 Public User                   🔒 Authenticated User
    ↓                                ↓
Check flags:                     Always gets full details:
├─ visible_to_public?            ├─ Event titles & descriptions
├─ show_details_to_public?       ├─ Attendee emails (clickable)
└─ Show nothing/blocks/full      ├─ Organizer info & meeting links
                                 └─ Complete metadata
```

**Authentication Flow:**
```
First Visit → Setup Password Screen
    ↓
🔑 Login → Session Cookie → Access Settings & Full Details
    ↓
❌ Failed Attempts → Temporary Lockout
```

**Event Click:**
```
Public User: Limited/No details based on settings
Auth User: Rich modal with smart links, duration, attendees
```

Auto-handles: recurring events 🔄, timezones 🌐, background sync 📡

## 📑 Docs

- See [DEVELOPMENT](./docs/development.md) for `development` guide.
- See [CONTRIBUTION](./docs/contribution.md) for `contribution` guide.

## 📜 License

Distributed under the MIT License © [wajeht](https://github.com/wajeht). See [LICENSE](./LICENSE) for more information.
