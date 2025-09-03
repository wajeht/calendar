import { CalendarDB } from './db'

const PORT = parseInt(Bun.env.PORT || '80');

const server = Bun.serve({
  port: PORT,
  
  routes: {
    // Static files served from memory (buffered at startup)
    "/": new Response(await Bun.file('./public/index.html').text(), {
      headers: { 'Content-Type': 'text/html' }
    }),
    "/favicon.ico": new Response(await Bun.file('./public/favicon.ico').bytes(), {
      headers: { 'Content-Type': 'image/x-icon' }
    }),
    "/favicon-16x16.png": new Response(await Bun.file('./public/favicon-16x16.png').bytes(), {
      headers: { 'Content-Type': 'image/png' }
    }),
    "/favicon-32x32.png": new Response(await Bun.file('./public/favicon-32x32.png').bytes(), {
      headers: { 'Content-Type': 'image/png' }
    }),
    "/apple-touch-icon.png": new Response(await Bun.file('./public/apple-touch-icon.png').bytes(), {
      headers: { 'Content-Type': 'image/png' }
    }),
    "/android-chrome-192x192.png": new Response(await Bun.file('./public/android-chrome-192x192.png').bytes(), {
      headers: { 'Content-Type': 'image/png' }
    }),
    "/android-chrome-512x512.png": new Response(await Bun.file('./public/android-chrome-512x512.png').bytes(), {
      headers: { 'Content-Type': 'image/png' }
    }),
    "/site.webmanifest": new Response(await Bun.file('./public/site.webmanifest').text(), {
      headers: { 'Content-Type': 'application/manifest+json' }
    }),
    "/robots.txt": new Response(await Bun.file('./public/robots.txt').text(), {
      headers: { 'Content-Type': 'text/plain' }
    }),

    // API routes
    "/api/proxy-ical": async (req) => {
      const url = new URL(req.url)
      const targetUrl = url.searchParams.get('url')
      if (!targetUrl) {
        return Response.json({ error: 'URL parameter required' }, { status: 400 })
      }

      try {
        const response = await fetch(targetUrl)
        if (!response.ok) {
          return Response.json({ error: 'Failed to fetch calendar' }, { status: 500 })
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
        return Response.json({ error: 'Failed to fetch calendar: ' + error.message }, { status: 500 })
      }
    },

    "/api/calendars": {
      GET: () => {
        const calendars = CalendarDB.getAll()
        return Response.json(calendars)
      },
      
      POST: async (req) => {
        try {
          const body = await req.json()
          const calendar = CalendarDB.add(body)
          return Response.json(calendar, { status: 201 })
        } catch (error: any) {
          return Response.json({ error: error.message }, { status: 400 })
        }
      },
      
      OPTIONS: () => {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        })
      }
    },
    
    "/api/calendars/:id": {
      DELETE: (req: any) => {
        const id = parseInt(req.params.id)
        if (isNaN(id)) {
          return Response.json({ error: 'Invalid ID' }, { status: 400 })
        }
        
        const success = CalendarDB.remove(id)
        if (!success) {
          return Response.json({ error: 'Calendar not found' }, { status: 404 })
        }
        
        return Response.json({ success: true })
      }
    }
  },

  // Fallback for unmatched routes
  fetch(req) {
    return new Response('Not Found', { status: 404 })
  }
})

console.log(`Server running at http://localhost:${server.port}`)