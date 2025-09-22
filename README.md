# 🗓️ Calendar

[![Node.js CI](https://github.com/wajeht/calendar/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/wajeht/calendar/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Open Source Love svg1](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/wajeht/calendar)

A web-based calendar application with multiple calendar source support via iCal/WebCal URLs.

# 📖 How It Works

```
📝 Add Calendar (name + color + iCal URL) → 🗄️ Database
    ↓
⚡ Immediately fetches iCal → ICAL.js parser → 3 versions stored:
├─ Raw iCal data
├─ Full events (titles, attendees, descriptions, locations)
└─ Stripped events (time slots only)
    ↓
👤 User visits calendar
    ↓
🌍 Public User                    🔒 Authenticated User
Check flags:                      Always full details:
├─ visible_to_public?             ├─ Titles & descriptions
├─ show_details_to_public?        ├─ Clickable attendee emails
└─ Show nothing/blocks/full       └─ Meeting links & metadata
    ↓                                 ↓
📱 Click event                    📱 Click event
Limited/no details               Rich modal with smart links
```

## 📑 Docs

- See [DEVELOPMENT](./docs/development.md) for `development` guide.
- See [CONTRIBUTION](./docs/contribution.md) for `contribution` guide.

## 📜 License

Distributed under the MIT License © [wajeht](https://github.com/wajeht). See [LICENSE](./LICENSE) for more information.
