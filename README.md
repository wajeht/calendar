# Calendar

[![Node.js CI](https://github.com/wajeht/calendar/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/wajeht/calendar/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Open Source Love svg1](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/wajeht/calendar)

A web-based calendar application with multiple calendar source support via iCal/WebCal URLs.

# How It Works

```
📝 Add Calendar (name + color + iCal URL) → 🗄️ Database
    ↓
⚡ Background fetch triggered → ICAL.js parser → 4 columns stored:
├─ Raw iCal data
├─ Processed events (all parsed)
├─ Public events (visibility-based)
└─ Private events (full details)
    ↓
👤 User visits calendar
    ↓
🌍 Public User                    🔒 Authenticated User
├─ visible_to_public=false        Always full details:
│  → Calendar hidden              ├─ Titles & descriptions
├─ show_details_to_public=false   ├─ Clickable attendee emails
│  → Time blocks only             └─ Meeting links & metadata
└─ show_details_to_public=true
   → Full details shown
```

## Docs

- See [DEVELOPMENT](./docs/development.md) for `development` guide.
- See [CONTRIBUTION](./docs/contribution.md) for `contribution` guide.

## License

Distributed under the MIT License © [wajeht](https://github.com/wajeht). See [LICENSE](./LICENSE) for more information.
