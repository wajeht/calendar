package calendar

import (
	"encoding/json"
	"time"

	"github.com/wajeht/calendar/internal/database"
)

type Logger interface {
	Error(msg string, args ...any)
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

func BuildFullCalendarData(calendars []database.Calendar, isAuthenticated bool, logger Logger) []FullCalendarData {
	var result []FullCalendarData

	for _, cal := range calendars {
		calData := FullCalendarData{
			ID:     cal.ID,
			Name:   cal.Name,
			Color:  cal.Color,
			Events: []FullCalendarEvent{},
		}

		if cal.Events != nil && *cal.Events != "" {
			var events []Event
			err := json.Unmarshal([]byte(*cal.Events), &events)
			if err != nil {
				logger.Error("Failed to unmarshal events", "calendar_id", cal.ID, "error", err)
				continue
			}

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

				if shouldHideDetails {
					fcEvent.Title = ""
					fcEvent.ExtendedProps["description"] = ""
					fcEvent.ExtendedProps["location"] = ""
				}

				if event.End != nil {
					endStr := event.End.Format("2006-01-02T15:04:05")
					fcEvent.End = &endStr
				}

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