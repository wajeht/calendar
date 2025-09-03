import { serveStatic } from 'hono/bun'
import { Hono } from 'hono'

const app = new Hono()

app.use(serveStatic({
    root: './public'
}))

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default { 
  port: 80, 
  fetch: app.fetch, 
}
