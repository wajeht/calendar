import { config } from './config';
import { CalendarDB } from './db'

let currentView = 'timeGridWeek';

const viewMap: Record<string, string> = {
  'month': 'dayGridMonth',
  'week': 'timeGridWeek',
  'day': 'timeGridDay',
  'list': 'listMonth',
  'dayGridMonth': 'dayGridMonth',
  'timeGridWeek': 'timeGridWeek',
  'timeGridDay': 'timeGridDay',
  'listMonth': 'listMonth'
};

const server = Bun.serve({
  port: config.APP_PORT,

  routes: {
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

    "/healthz": async () => {
      const health: any = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: {
          app: 'healthy',
          database: 'healthy',
          websocket: 'healthy'
        }
      };

      try {
        const calendars = CalendarDB.getAll();
        health.checks.database = 'healthy';
        health.checks.database_calendars_count = calendars.length;
      } catch (error: any) {
        health.status = 'unhealthy';
        health.checks.database = 'unhealthy';
        health.checks.database_error = error.message;
      }

      health.checks.websocket_connections = server.pendingWebSockets;

      const statusCode = health.status === 'healthy' ? 200 : 503;

      return Response.json(health, {
        status: statusCode,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    },

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
      },

      PATCH: async (req: any) => {
        const id = parseInt(req.params.id)
        if (isNaN(id)) {
          return Response.json({ error: 'Invalid ID' }, { status: 400 })
        }

        try {
          const body = await req.json()
          const success = CalendarDB.update(id, body)
          
          if (!success) {
            return Response.json({ error: 'Calendar not found or no changes made' }, { status: 404 })
          }

          return Response.json({ success: true })
        } catch (error: any) {
          return Response.json({ error: error.message }, { status: 400 })
        }
      }
    },

    "/api/calendar/view": {
      GET: (req: any) => {
        const url = new URL(req.url)
        const viewParam = url.searchParams.get('view')

        if (viewParam) {
          const mappedView = viewMap[viewParam.toLowerCase()]

          if (!mappedView) {
            return Response.json({
              error: 'Invalid view. Use: month, week, day, or list',
              validViews: ['month', 'week', 'day', 'list'],
              currentView
            }, { status: 400 })
          }

          currentView = mappedView

          server.publish("calendar", JSON.stringify({ type: 'changeView', view: mappedView }))

          return Response.json({
            success: true,
            view: mappedView,
            friendlyName: viewParam.toLowerCase()
          })
        }

        return Response.json({
          currentView,
          friendlyName: Object.entries({
            'dayGridMonth': 'month',
            'timeGridWeek': 'week',
            'timeGridDay': 'day',
            'listMonth': 'list'
          }).find(([k, v]) => k === currentView)?.[1] || currentView
        })
      },

      POST: async (req) => {
        try {
          const body = await req.json()
          const { view } = body

          const mappedView = viewMap[view?.toLowerCase()]

          if (!mappedView) {
            return Response.json({
              error: 'Invalid view. Use: month, week, day, or list',
              validViews: ['month', 'week', 'day', 'list']
            }, { status: 400 })
          }

          currentView = mappedView

          server.publish("calendar", JSON.stringify({ type: 'changeView', view: mappedView }))

          return Response.json({
            success: true,
            view: mappedView,
            friendlyName: view.toLowerCase()
          })
        } catch (error: any) {
          return Response.json({ error: error.message }, { status: 400 })
        }
      }
    }
  },

  async fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/ws") {
      if (server.upgrade(req)) {
        return;
      }
      return new Response("WebSocket upgrade failed", { status: 500 });
    }

    if (url.pathname === "/") {

      return new Response(await Bun.file('./public/index.html').text(), {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    return new Response('Not Found', { status: 404 })
  },

  websocket: {
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 120,
    sendPings: false,
    publishToSelf: true,
    perMessageDeflate: false,

    open(ws) {
      ws.subscribe("calendar")
    },

    message(ws, message) {},

    close(ws) {
      ws.unsubscribe("calendar")
    }
  }
})

console.log(`Server running at http://localhost:${server.port}`)
console.log(`WebSocket support enabled on ws://localhost:${server.port}`)
