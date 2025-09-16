package calendar

import (
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"github.com/wajeht/calendar/internal/database"
)

type Logger interface {
	Error(msg string, args ...any)
}

type Organizer struct {
	Name  string `json:"name,omitempty"`
	Email string `json:"email,omitempty"`
}

type Attendee struct {
	Name         string `json:"name,omitempty"`
	Email        string `json:"email,omitempty"`
	Role         string `json:"role,omitempty"`
	Status       string `json:"status,omitempty"`
	Type         string `json:"type,omitempty"`
}

type Event struct {
	Title        string      `json:"title"`
	Start        time.Time   `json:"start"`
	End          *time.Time  `json:"end,omitempty"`
	AllDay       bool        `json:"allDay"`
	Description  string      `json:"description,omitempty"`
	Location     string      `json:"location,omitempty"`
	UID          string      `json:"uid,omitempty"`
	URL          string      `json:"url,omitempty"`
	Duration     string      `json:"duration,omitempty"`
	DtStamp      *time.Time  `json:"dtStamp,omitempty"`
	Status       string      `json:"status,omitempty"`
	Transparency string      `json:"transparency,omitempty"`
	Sequence     int         `json:"sequence,omitempty"`
	Organizer    *Organizer  `json:"organizer,omitempty"`
	Attendees    []Attendee  `json:"attendees,omitempty"`
	Created      *time.Time  `json:"created,omitempty"`
	LastModified *time.Time  `json:"lastModified,omitempty"`
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
					ExtendedProps: buildExtendedProps(event),
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

func buildExtendedProps(event Event) map[string]string {
	props := map[string]string{
		"description":  event.Description,
		"location":     event.Location,
		"uid":          event.UID,
		"duration":     event.Duration,
		"status":       event.Status,
		"transparency": event.Transparency,
		"sequence":     strconv.Itoa(event.Sequence),
	}

	// Add timestamp fields if they exist
	if event.DtStamp != nil {
		props["dtStamp"] = event.DtStamp.Format("2006-01-02T15:04:05Z")
	}
	if event.Created != nil {
		props["created"] = event.Created.Format("2006-01-02T15:04:05Z")
	}
	if event.LastModified != nil {
		props["lastModified"] = event.LastModified.Format("2006-01-02T15:04:05Z")
	}

	// Add organizer information if it exists
	if event.Organizer != nil {
		if event.Organizer.Name != "" {
			props["organizerName"] = event.Organizer.Name
		}
		if event.Organizer.Email != "" {
			props["organizerEmail"] = event.Organizer.Email
		}
	}

	// Add attendee information if it exists
	if len(event.Attendees) > 0 {
		var attendeeNames, attendeeEmails []string
		for _, attendee := range event.Attendees {
			if attendee.Name != "" {
				attendeeNames = append(attendeeNames, attendee.Name)
			}
			if attendee.Email != "" {
				attendeeEmails = append(attendeeEmails, attendee.Email)
			}
		}
		if len(attendeeNames) > 0 {
			props["attendeeNames"] = strings.Join(attendeeNames, ", ")
		}
		if len(attendeeEmails) > 0 {
			props["attendeeEmails"] = strings.Join(attendeeEmails, ", ")
		}
		props["attendeeCount"] = strconv.Itoa(len(event.Attendees))
	}

	return props
}