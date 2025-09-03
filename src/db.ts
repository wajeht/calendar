import { Database } from 'bun:sqlite'

const db = new Database('calendars.db', { create: true })

// Create tables
db.run(`
  CREATE TABLE IF NOT EXISTS calendars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

export interface Calendar {
  id?: number
  url: string
  color: string
  name?: string
  created_at?: string
}

export const CalendarDB = {
  // Get all calendars
  getAll(): Calendar[] {
    return db.query('SELECT * FROM calendars ORDER BY created_at DESC').all() as Calendar[]
  },

  // Add a calendar
  add(calendar: Omit<Calendar, 'id' | 'created_at'>): Calendar {
    const stmt = db.prepare('INSERT INTO calendars (url, color, name) VALUES (?, ?, ?)')
    const result = stmt.run(calendar.url, calendar.color, calendar.name || null)
    return { ...calendar, id: result.lastInsertRowid as number }
  },

  // Remove a calendar
  remove(id: number): boolean {
    const stmt = db.prepare('DELETE FROM calendars WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },

  // Update a calendar
  update(id: number, calendar: Partial<Omit<Calendar, 'id' | 'created_at'>>): boolean {
    const fields = []
    const values = []
    
    if (calendar.url !== undefined) {
      fields.push('url = ?')
      values.push(calendar.url)
    }
    if (calendar.color !== undefined) {
      fields.push('color = ?')
      values.push(calendar.color)
    }
    if (calendar.name !== undefined) {
      fields.push('name = ?')
      values.push(calendar.name)
    }
    
    if (fields.length === 0) return false
    
    values.push(id)
    const stmt = db.prepare(`UPDATE calendars SET ${fields.join(', ')} WHERE id = ?`)
    const result = stmt.run(...values)
    return result.changes > 0
  }
}

export default db