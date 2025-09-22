# 🗓️ Calendar

[![Node.js CI](https://github.com/wajeht/calendar/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/wajeht/calendar/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Open Source Love svg1](https://badges.frapsoft.com/os/v1/open-source.svg?v=103)](https://github.com/wajeht/calendar)

A web-based calendar application with multiple calendar source support via iCal/WebCal URLs.

# 📖 How It Works

This calendar app fetches iCal data from external sources and displays events with different access levels for public and authenticated users.

## Adding Calendars

When you add a calendar, you provide a **name**, **color**, and **iCal/WebCal URL**. The app stores this info and immediately starts fetching calendar data. You can also set two important flags:
- **visible_to_public** - whether public users can see this calendar at all
- **show_details_to_public** - whether public users can see event details

## Data Processing

A cron job continuously fetches iCal data from your URLs and processes it using ICAL.js. For each calendar, it stores:
- **Raw iCal data** - the original calendar file
- **Full events** - complete event details with attendees, descriptions, locations, meeting links
- **Stripped events** - time slots only (no sensitive details)

## What Users See

**Public users** get different data depending on your settings:
- If a calendar isn't visible to public, they see nothing
- If visible but details are hidden, they only see time blocks (no titles, descriptions, or attendees)
- If details are shown, they see everything

**Authenticated users** always see full event details including:
- Event titles, descriptions, and locations
- Attendee names and clickable email addresses
- Organizer information
- Meeting links and phone numbers
- Complete event metadata and timestamps

## Authentication

On first visit, users see a setup screen to create a password. After that:
- Users enter the password to authenticate
- Failed attempts trigger temporary lockouts
- Authenticated sessions are maintained with secure cookies
- Only authenticated users can access settings and full event details

## Event Details

When clicking on events, users see different levels of detail:
- **Public users**: May see limited info or nothing, depending on calendar settings
- **Authenticated users**: Rich modal with full details, smart link detection, duration calculations, and all attendee information

The app automatically handles recurring events, timezone conversions, and keeps calendar data fresh through background sync jobs.

## 📑 Docs

- See [DEVELOPMENT](./docs/development.md) for `development` guide.
- See [CONTRIBUTION](./docs/contribution.md) for `contribution` guide.

## 📜 License

Distributed under the MIT License © [wajeht](https://github.com/wajeht). See [LICENSE](./LICENSE) for more information.
