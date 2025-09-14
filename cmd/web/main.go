package main

import (
	"flag"
	"log/slog"
	"os"
	"runtime/debug"
	"sync"

	"github.com/wajeht/calendar/internal/env"
)

type config struct {
	appUrl      string
	appPort     int
	appPassword string
}

type application struct {
	config config
	logger *slog.Logger
	wg     sync.WaitGroup
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))

	err := run(logger)
	if err != nil {
		trace := string(debug.Stack())
		logger.Error(err.Error(), "trace", trace)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	var cfg config

	cfg.appUrl = env.GetString("APP_URL", "http://localhost")
	cfg.appPort = env.GetInt("APP_PORT", 80)
	cfg.appPassword = env.GetString("APP_PASSWORD", "password")

	flag.Parse()

	app := &application{
		config: cfg,
		logger: logger,
	}

	return app.serveHTTP()
}
