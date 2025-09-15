package main

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
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

func (app *application) fetchCalendarData(calendarID int, url string) error {
	// Convert webcal:// to https://
	if strings.HasPrefix(url, "webcal://") {
		url = strings.Replace(url, "webcal://", "https://", 1)
	}

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Fetch the iCal data
	resp, err := client.Get(url)
	if err != nil {
		return fmt.Errorf("failed to fetch calendar data: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to fetch calendar data: HTTP %d", resp.StatusCode)
	}

	// Read the response body
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read calendar data: %w", err)
	}

	// Store the data in the database
	err = app.db.UpdateCalendarData(calendarID, string(data))
	if err != nil {
		return fmt.Errorf("failed to save calendar data: %w", err)
	}

	return nil
}

