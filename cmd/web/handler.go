package main

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"github.com/wajeht/calendar/assets"
	"github.com/wajeht/calendar/internal/calendar"
	"github.com/wajeht/calendar/internal/response"
)

const isAuthenticated = false

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

	calendars, err := app.db.GetVisibleCalendars()
	if err != nil {
		app.serverError(w, r, err)
		return
	}

	calendarData := calendar.BuildFullCalendarData(calendars, isAuthenticated, app.logger)

	calendarsJSON, err := json.Marshal(calendarData)
	if err != nil {
		app.serverError(w, r, err)
		return
	}
	data["Calendars"] = string(calendarsJSON)
	data["IsAuthenticated"] = isAuthenticated

	err = response.NamedTemplate(w, http.StatusOK, data, "home.html", "pages/home.html", "layouts/partials/*.html", "components/*.html")
	if err != nil {
		app.serverError(w, r, err)
	}
}

func (app *application) handleCalendarIndex(w http.ResponseWriter, r *http.Request) {
	calendars, err := app.db.GetAllCalendars()
	if err != nil {
		app.serverError(w, r, err)
		return
	}

	data := app.newTemplateData(r)
	data["Calendars"] = calendars

	err = response.PageWithLayout(w, http.StatusOK, data, "settings.html", "pages/calendar/index.html")
	if err != nil {
		app.serverError(w, r, err)
	}
}

func (app *application) handleCalendarCreate(w http.ResponseWriter, r *http.Request) {
	data := app.newTemplateData(r)

	err := response.PageWithLayout(w, http.StatusOK, data, "settings.html", "pages/calendar/create.html")
	if err != nil {
		app.serverError(w, r, err)
	}
}

func (app *application) handleCalendarStore(w http.ResponseWriter, r *http.Request) {
	err := r.ParseForm()
	if err != nil {
		app.serverError(w, r, err)
		return
	}

	name := r.FormValue("name")
	url := r.FormValue("url")
	color := r.FormValue("color")
	hidden := r.FormValue("hidden") == "1"
	details := r.FormValue("hide_details") == "1"

	if url == "" {
		http.Error(w, "URL is required", http.StatusBadRequest)
		return
	}

	if color == "" {
		color = "#0084d1"
	}

	id, err := app.db.InsertCalendar(name, url, color, hidden, details)
	if err != nil {
		app.serverError(w, r, err)
		return
	}

	app.backgroundTask(r, func() error {
		return app.fetchCalendarData(id, url)
	})

	http.Redirect(w, r, "/calendars", http.StatusSeeOther)
}

func (app *application) handleCalendarEdit(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		app.serverError(w, r, err)
		return
	}

	calendar, found, err := app.db.GetCalendar(id)
	if err != nil {
		app.serverError(w, r, err)
		return
	}
	if !found {
		app.notFound(w, r)
		return
	}

	data := app.newTemplateData(r)
	data["Calendar"] = calendar

	err = response.PageWithLayout(w, http.StatusOK, data, "settings.html", "pages/calendar/edit.html")
	if err != nil {
		app.serverError(w, r, err)
	}
}

func (app *application) handleCalendarUpdate(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		app.serverError(w, r, err)
		return
	}

	err = r.ParseForm()
	if err != nil {
		app.serverError(w, r, err)
		return
	}

	name := r.FormValue("name")
	url := r.FormValue("url")
	color := r.FormValue("color")
	hidden := r.FormValue("hidden") == "1"
	details := r.FormValue("hide_details") == "1"

	if url == "" {
		http.Error(w, "URL is required", http.StatusBadRequest)
		return
	}

	if color == "" {
		color = "#0084d1"
	}

	err = app.db.UpdateCalendar(id, name, url, color, hidden, details)
	if err != nil {
		app.serverError(w, r, err)
		return
	}

	app.backgroundTask(r, func() error {
		return app.fetchCalendarData(id, url)
	})

	http.Redirect(w, r, "/calendars", http.StatusSeeOther)
}

func (app *application) handleCalendarDelete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		app.serverError(w, r, err)
		return
	}

	_, found, err := app.db.GetCalendar(id)
	if err != nil {
		app.serverError(w, r, err)
		return
	}

	if !found {
		app.notFound(w, r)
		return
	}

	err = app.db.DeleteCalendar(id)
	if err != nil {
		app.serverError(w, r, err)
		return
	}

	http.Redirect(w, r, "/calendars", http.StatusSeeOther)
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

func (app *application) handleCalendarRefetch(w http.ResponseWriter, r *http.Request) {
	calendars, err := app.db.GetAllCalendars()
	if err != nil {
		app.serverError(w, r, err)
		return
	}

	for _, calendar := range calendars {
		app.backgroundTask(r, func() error {
			return app.fetchCalendarData(calendar.ID, calendar.URL)
		})
	}

	http.Redirect(w, r, "/calendars", http.StatusSeeOther)
}
