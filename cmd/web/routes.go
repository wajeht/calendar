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

	mux.HandleFunc("GET /calendar", app.handleCalendar)

	mux.HandleFunc("GET /{$}", app.handleCalendar)

	return app.recoverPanic(app.securityHeaders(mux))

}
