import { CalendarDB } from './db'

const server = Bun.serve({
  port: 80,
  async fetch(request) {
    const url = new URL(request.url)
    
    // Serve static files
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(Bun.file('./public/index.html'))
    }
    
    // API Routes - no authentication required
    if (url.pathname.startsWith('/api/')) {
      // Proxy endpoint for fetching calendars
      if (url.pathname === '/api/proxy-ical') {
        const targetUrl = url.searchParams.get('url')
        if (!targetUrl) {
          return new Response(JSON.stringify({ error: 'URL parameter required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          })
        }

        try {
          const response = await fetch(targetUrl)
          if (!response.ok) {
            return new Response(JSON.stringify({ error: 'Failed to fetch calendar' }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            })
          }
          
          const text = await response.text()
          return new Response(text, {
            headers: {
              'Content-Type': 'text/calendar',
              'Cache-Control': 'max-age=300',
              'Access-Control-Allow-Origin': '*'
            }
          })
        } catch (error: any) {
          return new Response(JSON.stringify({ error: 'Failed to fetch calendar: ' + error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          })
        }
      }

      // GET /api/calendars
      if (url.pathname === '/api/calendars' && request.method === 'GET') {
        const calendars = CalendarDB.getAll()
        return new Response(JSON.stringify(calendars), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // POST /api/calendars
      if (url.pathname === '/api/calendars' && request.method === 'POST') {
        try {
          const body = await request.json()
          const calendar = CalendarDB.add(body)
          return new Response(JSON.stringify(calendar), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
          })
        } catch (error: any) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          })
        }
      }

      // DELETE /api/calendars/:id
      if (url.pathname.startsWith('/api/calendars/') && request.method === 'DELETE') {
        const id = parseInt(url.pathname.split('/')[3])
        if (isNaN(id)) {
          return new Response(JSON.stringify({ error: 'Invalid ID' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        
        const success = CalendarDB.remove(id)
        if (!success) {
          return new Response(JSON.stringify({ error: 'Calendar not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // OPTIONS for CORS
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        })
      }
    }

    return new Response('Not Found', { status: 404 })
  }
})

console.log(`Server running at http://localhost:${server.port}`)