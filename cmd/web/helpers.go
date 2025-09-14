package main

import (
	"fmt"
	"net/http"
)

func (app *application) newTemplateData(r *http.Request) map[string]any {
	data := map[string]any{
		"RequestPath": r.URL.Path,
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
