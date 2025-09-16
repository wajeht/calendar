package parser

import (
	"fmt"
	"regexp"
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