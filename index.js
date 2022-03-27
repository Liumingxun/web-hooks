import { createServer } from 'http'
import createHandler from 'github-webhook-handler'

const handler = createHandler({ path: '/webhooks', secret: 'secret' })

createServer((req, res) => {
  handler(req, res, (err) => {
    res.statusCode = 404
    res.end('no such location')
  })
}).listen(33345)

handler.on('error', (err) => {
  console.error('Error:', err.message)
})

handler.on('push', function (event) {
  console.log('Received a push event for %s to %s',
    event.payload.repository.name,
    event.payload.ref)
})
