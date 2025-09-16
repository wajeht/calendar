package parser

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/wajeht/calendar/internal/calendar"
)

func ParseICalToEvents(icalData string) ([]calendar.Event, error) {
	var events []calendar.Event
	lines := strings.Split(icalData, "\n")

	var currentEvent *calendar.Event
	inEvent := false

	for _, line := range lines {
		line = strings.TrimSpace(line)

		if line == "BEGIN:VEVENT" {
			inEvent = true
			currentEvent = &calendar.Event{}
			continue
		}

		if line == "END:VEVENT" {
			if currentEvent != nil {
				events = append(events, *currentEvent)
			}
			inEvent = false
			currentEvent = nil
			continue
		}

		if !inEvent || currentEvent == nil {
			continue
		}

		// Parse event properties
		if strings.HasPrefix(line, "SUMMARY:") {
			currentEvent.Title = strings.TrimPrefix(line, "SUMMARY:")
		} else if strings.HasPrefix(line, "DTSTART") {
			startTime, allDay, err := parseICalDateTime(line)
			if err == nil {
				currentEvent.Start = startTime
				currentEvent.AllDay = allDay
			}
		} else if strings.HasPrefix(line, "DTEND") {
			endTime, _, err := parseICalDateTime(line)
			if err == nil {
				currentEvent.End = &endTime
			}
		} else if strings.HasPrefix(line, "DESCRIPTION:") {
			currentEvent.Description = strings.TrimPrefix(line, "DESCRIPTION:")
		} else if strings.HasPrefix(line, "LOCATION:") {
			currentEvent.Location = strings.TrimPrefix(line, "LOCATION:")
		} else if strings.HasPrefix(line, "UID:") {
			currentEvent.UID = strings.TrimPrefix(line, "UID:")
		} else if strings.HasPrefix(line, "URL:") {
			currentEvent.URL = strings.TrimPrefix(line, "URL:")
		} else if strings.HasPrefix(line, "DURATION:") {
			currentEvent.Duration = strings.TrimPrefix(line, "DURATION:")
		} else if strings.HasPrefix(line, "DTSTAMP:") {
			if dtStamp, err := parseICalTimestamp(strings.TrimPrefix(line, "DTSTAMP:")); err == nil {
				currentEvent.DtStamp = &dtStamp
			}
		} else if strings.HasPrefix(line, "STATUS:") {
			currentEvent.Status = strings.TrimPrefix(line, "STATUS:")
		} else if strings.HasPrefix(line, "TRANSP:") {
			currentEvent.Transparency = strings.TrimPrefix(line, "TRANSP:")
		} else if strings.HasPrefix(line, "SEQUENCE:") {
			if seq, err := strconv.Atoi(strings.TrimPrefix(line, "SEQUENCE:")); err == nil {
				currentEvent.Sequence = seq
			}
		} else if strings.HasPrefix(line, "ORGANIZER") {
			if organizer := parseOrganizer(line); organizer != nil {
				currentEvent.Organizer = organizer
			}
		} else if strings.HasPrefix(line, "ATTENDEE") {
			if attendee := parseAttendee(line); attendee != nil {
				currentEvent.Attendees = append(currentEvent.Attendees, *attendee)
			}
		} else if strings.HasPrefix(line, "CREATED:") {
			if created, err := parseICalTimestamp(strings.TrimPrefix(line, "CREATED:")); err == nil {
				currentEvent.Created = &created
			}
		} else if strings.HasPrefix(line, "LAST-MODIFIED:") {
			if lastMod, err := parseICalTimestamp(strings.TrimPrefix(line, "LAST-MODIFIED:")); err == nil {
				currentEvent.LastModified = &lastMod
			}
		}
	}

	return events, nil
}

func parseICalDateTime(dtLine string) (time.Time, bool, error) {
	// Extract the datetime value
	re := regexp.MustCompile(`DT(?:START|END)[^:]*:(.+)`)
	matches := re.FindStringSubmatch(dtLine)
	if len(matches) < 2 {
		return time.Time{}, false, fmt.Errorf("no datetime found")
	}

	dateStr := matches[1]

	// Check if it's an all-day event (date only, no time)
	if len(dateStr) == 8 { // YYYYMMDD
		t, err := time.Parse("20060102", dateStr)
		return t, true, err
	}

	// Parse datetime formats
	formats := []string{
		"20060102T150405Z", // UTC
		"20060102T150405",  // Local time
	}

	for _, format := range formats {
		if t, err := time.Parse(format, dateStr); err == nil {
			return t, false, nil
		}
	}

	return time.Time{}, false, fmt.Errorf("unable to parse datetime: %s", dateStr)
}

func parseICalTimestamp(dateStr string) (time.Time, error) {
	formats := []string{
		"20060102T150405Z", // UTC
		"20060102T150405",  // Local time
	}

	for _, format := range formats {
		if t, err := time.Parse(format, dateStr); err == nil {
			return t, nil
		}
	}

	return time.Time{}, fmt.Errorf("unable to parse timestamp: %s", dateStr)
}

func parseOrganizer(line string) *calendar.Organizer {
	organizer := &calendar.Organizer{}

	// Extract email from ORGANIZER line (format: ORGANIZER;CN=Name:mailto:email)
	if strings.Contains(line, "mailto:") {
		emailStart := strings.Index(line, "mailto:") + 7
		organizer.Email = line[emailStart:]
	}

	// Extract name from CN parameter
	if cnMatch := regexp.MustCompile(`CN=([^;:]+)`).FindStringSubmatch(line); len(cnMatch) > 1 {
		organizer.Name = cnMatch[1]
	}

	if organizer.Email == "" && organizer.Name == "" {
		return nil
	}

	return organizer
}

func parseAttendee(line string) *calendar.Attendee {
	attendee := &calendar.Attendee{}

	// Extract email from ATTENDEE line (format: ATTENDEE;parameters:mailto:email)
	if strings.Contains(line, "mailto:") {
		emailStart := strings.Index(line, "mailto:") + 7
		attendee.Email = line[emailStart:]
	}

	// Extract name from CN parameter
	if cnMatch := regexp.MustCompile(`CN=([^;:]+)`).FindStringSubmatch(line); len(cnMatch) > 1 {
		attendee.Name = cnMatch[1]
	}

	// Extract role from ROLE parameter
	if roleMatch := regexp.MustCompile(`ROLE=([^;:]+)`).FindStringSubmatch(line); len(roleMatch) > 1 {
		attendee.Role = roleMatch[1]
	}

	// Extract participation status from PARTSTAT parameter
	if statusMatch := regexp.MustCompile(`PARTSTAT=([^;:]+)`).FindStringSubmatch(line); len(statusMatch) > 1 {
		attendee.Status = statusMatch[1]
	}

	// Extract type from CUTYPE parameter
	if typeMatch := regexp.MustCompile(`CUTYPE=([^;:]+)`).FindStringSubmatch(line); len(typeMatch) > 1 {
		attendee.Type = typeMatch[1]
	}

	if attendee.Email == "" && attendee.Name == "" {
		return nil
	}

	return attendee
}