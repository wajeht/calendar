package main

import (
	"log/slog"
	"net/http"
	"runtime/debug"

	"github.com/wajeht/calendar/internal/response"
)

func (app *application) reportServerError(r *http.Request, err error) {
	var (
		message = err.Error()
		method  = r.Method
		url     = r.URL.String()
		trace   = string(debug.Stack())
	)

	requestAttrs := slog.Group("request", "method", method, "url", url)
	app.logger.Error(message, requestAttrs, "trace", trace)
}

func (app *application) serverError(w http.ResponseWriter, r *http.Request, err error) {
	app.reportServerError(r, err)

	data := app.newTemplateData(r)
	data["Status"] = 500
	data["Message"] = "The server encountered a problem and could not process your request"

	renderErr := response.Page(w, http.StatusInternalServerError, data, "pages/error.html")
	if renderErr != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
	}
}

func (app *application) notFound(w http.ResponseWriter, r *http.Request) {
	data := app.newTemplateData(r)
	data["Status"] = 404
	data["Message"] = "The requested resource could not be found"

	err := response.Page(w, http.StatusNotFound, data, "pages/error.html")
	if err != nil {
		http.Error(w, "Not Found", http.StatusNotFound)
	}
}

func (app *application) badRequest(w http.ResponseWriter, r *http.Request, err error) {
	data := app.newTemplateData(r)
	data["Status"] = 400
	data["Message"] = err.Error()

	renderErr := response.Page(w, http.StatusBadRequest, data, "pages/error.html")
	if renderErr != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
	}
}
