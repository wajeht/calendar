package database

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

type Calendar struct {
	ID        int       `db:"id"`
	Name      string    `db:"name"`
	URL       string    `db:"url"`
	Color     string    `db:"color"`
	Hidden    bool      `db:"hidden"`
	Details   bool      `db:"details"`
	Data      *string   `db:"data"`
	CreatedAt time.Time `db:"created_at"`
	UpdatedAt time.Time `db:"updated_at"`
}

func (db *DB) InsertCalendar(name, url, color string, hidden, details bool) (int, error) {
	ctx, cancel := context.WithTimeout(context.Background(), defaultTimeout)
	defer cancel()

	query := `
		INSERT INTO calendars (name, url, color, hidden, details, data, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

	result, err := db.ExecContext(ctx, query, name, url, color, hidden, details, nil, time.Now(), time.Now())
	if err != nil {
		return 0, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}

	return int(id), nil
}

func (db *DB) GetCalendar(id int) (Calendar, bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), defaultTimeout)
	defer cancel()

	var calendar Calendar

	query := `SELECT * FROM calendars WHERE id = ?`

	err := db.GetContext(ctx, &calendar, query, id)
	if errors.Is(err, sql.ErrNoRows) {
		return Calendar{}, false, nil
	}

	return calendar, true, err
}

func (db *DB) GetAllCalendars() ([]Calendar, error) {
	ctx, cancel := context.WithTimeout(context.Background(), defaultTimeout)
	defer cancel()

	var calendars []Calendar

	query := `SELECT * FROM calendars ORDER BY created_at ASC`

	err := db.SelectContext(ctx, &calendars, query)
	return calendars, err
}

func (db *DB) GetVisibleCalendars() ([]Calendar, error) {
	ctx, cancel := context.WithTimeout(context.Background(), defaultTimeout)
	defer cancel()

	var calendars []Calendar

	query := `SELECT * FROM calendars WHERE hidden = 0 AND data IS NOT NULL AND LENGTH(data) > 50 ORDER BY created_at ASC`

	err := db.SelectContext(ctx, &calendars, query)
	return calendars, err
}


func (db *DB) UpdateCalendar(id int, name, url, color string, hidden, details bool) error {
	ctx, cancel := context.WithTimeout(context.Background(), defaultTimeout)
	defer cancel()

	query := `
		UPDATE calendars
		SET name = ?, url = ?, color = ?, hidden = ?, details = ?, updated_at = ?
		WHERE id = ?`

	_, err := db.ExecContext(ctx, query, name, url, color, hidden, details, time.Now(), id)
	return err
}

func (db *DB) UpdateCalendarData(id int, data string) error {
	ctx, cancel := context.WithTimeout(context.Background(), defaultTimeout)
	defer cancel()

	query := `UPDATE calendars SET data = ?, updated_at = ? WHERE id = ?`

	_, err := db.ExecContext(ctx, query, data, time.Now(), id)
	return err
}

func (db *DB) DeleteCalendar(id int) error {
	ctx, cancel := context.WithTimeout(context.Background(), defaultTimeout)
	defer cancel()

	query := `DELETE FROM calendars WHERE id = ?`

	_, err := db.ExecContext(ctx, query, id)
	return err
}

func (db *DB) GetCalendarByURL(url string) (Calendar, bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), defaultTimeout)
	defer cancel()

	var calendar Calendar

	query := `SELECT * FROM calendars WHERE url = ?`

	err := db.GetContext(ctx, &calendar, query, url)
	if errors.Is(err, sql.ErrNoRows) {
		return Calendar{}, false, nil
	}

	return calendar, true, err
}
