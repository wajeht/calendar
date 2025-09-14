package main

import (
	"io"
	"net/http"

	"github.com/wajeht/calendar/assets"
	"github.com/wajeht/calendar/internal/response"
)

func (app *application) handleFavicon(w http.ResponseWriter, r *http.Request) {
	f, err := assets.EmbeddedFiles.Open("static/favicon.ico")
	if err != nil {
		app.serverError(w, r, err)
	}
	defer f.Close()

	w.Header().Set("Content-Type", "image/x-icon")
	io.Copy(w, f)

}

func (app *application) handleRobots(w http.ResponseWriter, r *http.Request) {
	f, err := assets.EmbeddedFiles.Open("static/robots.txt")
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer f.Close()

	w.Header().Set("Content-Type", "text/plain")
	io.Copy(w, f)
}

func (app *application) handleHealthz(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "text/plain")
	w.Write([]byte("ok"))
}

func (app *application) handleCalendar(w http.ResponseWriter, r *http.Request) {
	data := app.newTemplateData(r)

	err := response.Page(w, http.StatusOK, data, "pages/calendar.html")
	if err != nil {
		app.serverError(w, r, err)
	}
}

func (app *application) handleSettings(w http.ResponseWriter, r *http.Request) {
	data := app.newTemplateData(r)

	err := response.Page(w, http.StatusOK, data, "pages/settings.html")
	if err != nil {
		app.serverError(w, r, err)
	}
}

func (app *application) handleSettingsPost(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain")
	w.Write([]byte("handleSettingsPost"))
}
