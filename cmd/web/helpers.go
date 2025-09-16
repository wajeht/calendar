package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/wajeht/calendar/internal/database"
)

func (app *application) newTemplateData(r *http.Request) map[string]any {
	data := map[string]any{
		"RequestPath": r.URL.Path,
		"Year":        time.Now().Year(),
	}

	return data
}

func (app *application) backgroundTask(r *http.Request, fn func() error) {
	app.wg.Add(1)

	go func() {
		defer app.wg.Done()

		defer func() {
			pv := recover()
			if pv != nil {
				app.reportServerError(r, fmt.Errorf("%v", pv))
			}
		}()

		err := fn()
		if err != nil {
			app.reportServerError(r, err)
		}
	}()
}

type Event struct {
	Title       string     `json:"title"`
	Start       time.Time  `json:"start"`
	End         *time.Time `json:"end,omitempty"`
	AllDay      bool       `json:"allDay"`
	Description string     `json:"description,omitempty"`
	Location    string     `json:"location,omitempty"`
	UID         string     `json:"uid,omitempty"`
	URL         string     `json:"url,omitempty"`
}

func (app *application) fetchCalendarData(calendarID int, url string) error {
	if strings.HasPrefix(url, "webcal://") {
		url = strings.Replace(url, "webcal://", "https://", 1)
	}

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	resp, err := client.Get(url)
	if err != nil {
		return fmt.Errorf("failed to fetch calendar data: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to fetch calendar data: HTTP %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read calendar data: %w", err)
	}

	err = app.db.UpdateCalendarData(calendarID, string(data))
	if err != nil {
		return fmt.Errorf("failed to save calendar data: %w", err)
	}

	events, err := app.parseICalToEvents(string(data))
	if err != nil {
		return fmt.Errorf("failed to parse calendar events: %w", err)
	}

	eventsJSON, err := json.Marshal(events)
	if err != nil {
		return fmt.Errorf("failed to marshal events to JSON: %w", err)
	}

	err = app.db.UpdateCalendarEvents(calendarID, string(eventsJSON))
	if err != nil {
		return fmt.Errorf("failed to save calendar events: %w", err)
	}

	return nil
}

func (app *application) parseICalToEvents(icalData string) ([]Event, error) {
	var events []Event
	lines := strings.Split(icalData, "\n")

	var currentEvent *Event
	inEvent := false

	for _, line := range lines {
		line = strings.TrimSpace(line)

		if line == "BEGIN:VEVENT" {
			inEvent = true
			currentEvent = &Event{}
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
			startTime, allDay, err := app.parseICalDateTime(line)
			if err == nil {
				currentEvent.Start = startTime
				currentEvent.AllDay = allDay
			}
		} else if strings.HasPrefix(line, "DTEND") {
			endTime, _, err := app.parseICalDateTime(line)
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

func (app *application) parseICalDateTime(dtLine string) (time.Time, bool, error) {
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

type FullCalendarData struct {
	ID     int                 `json:"id"`
	Name   string              `json:"name"`
	Color  string              `json:"color"`
	Events []FullCalendarEvent `json:"events"`
}

type FullCalendarEvent struct {
	Title           string            `json:"title"`
	Start           string            `json:"start"`
	End             *string           `json:"end,omitempty"`
	AllDay          bool              `json:"allDay"`
	BackgroundColor string            `json:"backgroundColor"`
	BorderColor     string            `json:"borderColor"`
	TextColor       string            `json:"textColor"`
	ExtendedProps   map[string]string `json:"extendedProps"`
	URL             *string           `json:"url,omitempty"`
}

func (app *application) buildFullCalendarData(calendars []database.Calendar, isAuthenticated bool) []FullCalendarData {
	var result []FullCalendarData

	for _, cal := range calendars {
		calData := FullCalendarData{
			ID:     cal.ID,
			Name:   cal.Name,
			Color:  cal.Color,
			Events: []FullCalendarEvent{},
		}

		// Parse events from JSON column
		if cal.Events != nil && *cal.Events != "" {
			var events []Event
			err := json.Unmarshal([]byte(*cal.Events), &events)
			if err != nil {
				app.logger.Error("Failed to unmarshal events", "calendar_id", cal.ID, "error", err)
				continue
			}

			// Transform to FullCalendar format with styling and visibility rules
			for _, event := range events {
				shouldHideDetails := !isAuthenticated && cal.Details

				fcEvent := FullCalendarEvent{
					Title:           event.Title,
					Start:           event.Start.Format("2006-01-02T15:04:05"),
					AllDay:          event.AllDay,
					BackgroundColor: cal.Color,
					BorderColor:     cal.Color,
					TextColor:       "white",
					ExtendedProps: map[string]string{
						"description": event.Description,
						"location":    event.Location,
						"uid":         event.UID,
					},
				}

				// Apply visibility rules
				if shouldHideDetails {
					fcEvent.Title = ""
					fcEvent.ExtendedProps["description"] = ""
					fcEvent.ExtendedProps["location"] = ""
				}

				// Add end time if present
				if event.End != nil {
					endStr := event.End.Format("2006-01-02T15:04:05")
					fcEvent.End = &endStr
				}

				// Add URL if present
				if event.URL != "" {
					fcEvent.URL = &event.URL
				}

				calData.Events = append(calData.Events, fcEvent)
			}
		}

		result = append(result, calData)
	}

	return result
}
