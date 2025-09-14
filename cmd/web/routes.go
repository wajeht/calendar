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
	mux.HandleFunc("GET /site.webmanifest", app.handleWebmanifest)
	mux.HandleFunc("GET /healthz", app.handleHealthz)

	mux.HandleFunc("GET /calendars", app.handleCalendar)
	mux.HandleFunc("GET /calendars/create", app.handleCalendarCreate)
	mux.HandleFunc("POST /calendars", app.handleCalendarCreatePost)
	mux.HandleFunc("GET /calendars/{id}/edit", app.handleCalendarEdit)
	mux.HandleFunc("POST /calendars/{id}", app.handleCalendarEditPost)
	mux.HandleFunc("DELETE /calendars/{id}", app.handleCalendarDelete)

	mux.HandleFunc("GET /api/auth", app.handleAPIAuth)
	mux.HandleFunc("POST /api/auth", app.handleAPIAuthPost)
	mux.HandleFunc("GET /api/calendars", app.handleAPICalendars)
	mux.HandleFunc("GET /api/proxy-ical", app.handleAPIProxyIcal)

	mux.HandleFunc("GET /", app.handleHome)

	return app.recoverPanic(app.securityHeaders(mux))
}
