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

func (app *application) handleWebmanifest(w http.ResponseWriter, r *http.Request) {
	f, err := assets.EmbeddedFiles.Open("static/site.webmanifest")
	if err != nil {
		app.serverError(w, r, err)
	}
	defer f.Close()

	w.Header().Set("Content-Type", "application/json")
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

func (app *application) handleHome(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		app.notFound(w, r)
		return
	}

	data := app.newTemplateData(r)

	err := response.PageWithLayout(w, http.StatusOK, data, "home.html", "pages/home.html")
	if err != nil {
		app.serverError(w, r, err)
	}
}

func (app *application) handleCalendarIndex(w http.ResponseWriter, r *http.Request) {
	data := app.newTemplateData(r)

	err := response.PageWithLayout(w, http.StatusOK, data, "settings.html", "pages/calendar/calendar-index.html")
	if err != nil {
		app.serverError(w, r, err)
	}
}

func (app *application) handleCalendarCreate(w http.ResponseWriter, r *http.Request) {
	data := app.newTemplateData(r)

	err := response.PageWithLayout(w, http.StatusOK, data, "settings.html", "pages/calendar/calendar-create.html")
	if err != nil {
		app.serverError(w, r, err)
	}
}

func (app *application) handleCalendarStore(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain")
	w.Write([]byte("TODO: handleCalendarStore"))
}

func (app *application) handleCalendarEdit(w http.ResponseWriter, r *http.Request) {
	data := app.newTemplateData(r)

	err := response.PageWithLayout(w, http.StatusOK, data, "settings.html", "pages/calendar/calendar-edit.html")
	if err != nil {
		app.serverError(w, r, err)
	}
}

func (app *application) handleCalendarUpdate(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain")
	w.Write([]byte("TODO: handleCalendarUpdate"))
}

func (app *application) handleCalendarDelete(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain")
	w.Write([]byte("TODO: handleCalendarDelete"))
}

func (app *application) handleAPIAuth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"authenticated": false}`))
}

func (app *application) handleAPIAuthPost(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	w.Write([]byte(`{"error": "Authentication not implemented"}`))
}

func (app *application) handleAPICalendar(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte("[]"))
}

func (app *application) handleAPIProxyIcal(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/calendar")
	w.WriteHeader(http.StatusNotFound)
	w.Write([]byte("iCal proxy not implemented"))
}
