package main

import (
	"flag"
	"log/slog"
	"os"
	"runtime/debug"
	"sync"

	"github.com/wajeht/calendar/internal/database"
	"github.com/wajeht/calendar/internal/env"
)

type config struct {
	appEnv        string
	appUrl        string
	appPort       int
	appPassword   string
	dbPath        string
	dbAutomigrate bool
}

type application struct {
	config config
	logger *slog.Logger
	db     *database.DB
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

	cfg.appEnv = env.GetString("APP_ENV", "development")
	cfg.appUrl = env.GetString("APP_URL", "http://localhost")
	cfg.appPort = env.GetInt("APP_PORT", 80)
	cfg.appPassword = env.GetString("APP_PASSWORD", "password")
	cfg.dbPath = env.GetString("DB_PATH", "calendar.sqlite")
	cfg.dbAutomigrate = env.GetBool("DB_AUTOMIGRATE", true)

	flag.Parse()

	runVacuum := cfg.appEnv == "production"
	db, err := database.New(cfg.dbPath, cfg.dbAutomigrate, runVacuum)
	if err != nil {
		return err
	}
	defer db.Close()

	app := &application{
		config: cfg,
		logger: logger,
		db:     db,
	}

	return app.serveHTTP()
}
