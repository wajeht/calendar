import { Database } from 'bun:sqlite'
import { config } from './config';

const db = new Database(config.APP_DATABASE_PATH, { create: true })

db.run(`
  CREATE TABLE IF NOT EXISTS calendars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    name TEXT,
    hidden BOOLEAN DEFAULT 0,
    details BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

export interface Calendar {
  id?: number
  url: string
  color: string
  name?: string
  hidden?: number
  details?: number
  created_at?: string
}

export const calendar = {
  getAll(): Calendar[] {
    return db.query('SELECT * FROM calendars ORDER BY created_at DESC').all() as Calendar[]
  },

  add(data: Omit<Calendar, 'id' | 'created_at'>): Calendar {
    const stmt = db.prepare('INSERT INTO calendars (url, color, name, hidden, details) VALUES (?, ?, ?, ?, ?)')
    const result = stmt.run(
      data.url,
      data.color,
      data.name || null,
      data.hidden || 0,
      data.details || 0
    )
    return { ...data, id: result.lastInsertRowid as number }
  },

  remove(id: number): boolean {
    const stmt = db.prepare('DELETE FROM calendars WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },

  update(id: number, data: Partial<Omit<Calendar, 'id' | 'created_at'>>): boolean {
    const fields = []
    const values = []

    if (data.url !== undefined) {
      fields.push('url = ?')
      values.push(data.url)
    }
    if (data.color !== undefined) {
      fields.push('color = ?')
      values.push(data.color)
    }
    if (data.name !== undefined) {
      fields.push('name = ?')
      values.push(data.name)
    }
    if (data.hidden !== undefined) {
      fields.push('hidden = ?')
      values.push(data.hidden || 0)
    }
    if (data.details !== undefined) {
      fields.push('details = ?')
      values.push(data.details || 0)
    }

    if (fields.length === 0) return false

    values.push(id)
    const stmt = db.prepare(`UPDATE calendars SET ${fields.join(', ')} WHERE id = ?`)
    const result = stmt.run(...values)
    return result.changes > 0
  }
}

export default db
