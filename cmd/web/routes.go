package main

import (
	"net/http"

	"github.com/wajeht/calendar/assets"
)

func (app *application) routes() http.Handler {

	mux := http.NewServeMux()

	fileServer := http.FileServer(http.FS((assets.EmbeddedFiles)))

	mux.Handle("GET /static/", app.neuter(fileServer))

	mux.HandleFunc("GET /favicon.ico", app.handleFavicon)

	mux.HandleFunc("GET /robots.txt", app.handleRobots)

	mux.HandleFunc("GET /healthz", app.handleHealthz)

	mux.HandleFunc("GET /settings", app.handleSettings)
	mux.HandleFunc("POST /settings", app.handleSettingsPost)

	// Main calendar display
	mux.HandleFunc("GET /calendar", app.handleCalendar)
	mux.HandleFunc("GET /{$}", app.handleCalendar)

	// Calendar management routes
	mux.HandleFunc("GET /calendar/create", app.handleCalendarCreate)
	mux.HandleFunc("POST /calendar/create", app.handleCalendarCreatePost)
	mux.HandleFunc("GET /calendar/{id}/edit", app.handleCalendarEdit)
	mux.HandleFunc("POST /calendar/{id}/edit", app.handleCalendarEditPost)
	mux.HandleFunc("DELETE /calendar/{id}", app.handleCalendarDelete)

	return app.recoverPanic(app.securityHeaders(mux))

}
