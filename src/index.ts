import express from 'express'
import bodyParser from 'body-parser'
import { AddressInfo } from 'net'
import { resolve } from 'path'
import { createConnection } from './sql'
import { log } from './util'
import { randomBytes } from 'crypto'

(async function() {
  process.on('uncaughtException', err => {
    console.error(err)
  })

  const db = await createConnection('mysql://localhost:3306/urlshortener', process.env.MYSQL_USER || '', process.env.MYSQL_PASSWORD || '')

  type Short = { id: number, identifier: string, url: string, created: Date }
  type Use = { used: string, when: Date }

  const stmts = {
    get: db.prepare<Short>(`SELECT id, identifier, url, created FROM shorts WHERE url = ?`),
    getUrl: db.prepare<Short>(`SELECT id, identifier, url, created FROM shorts WHERE identifier = ?`),
    put: db.prepare<void>(`INSERT INTO shorts (url, identifier) VALUES (?, ?)`),
    use: db.prepare<void>('INSERT INTO uses (used) VALUES (?)'),
    uses: db.prepare<Use>('SELECT used, at FROM uses WHERE used = ?'),
  }

  const app = express()
  app.set('view engine', 'pug')

  app.use('/static', express.static(resolve(__dirname, '..', 'static')))
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use((req, _, next) => {
    log(req.method, req.url)
    next()
  })
  app.get('/', (_, res) => res.render('index'))
  app.post('/', async (req, res) => {
    log('debug', req.body)
    const { url } = req.body
    const ctx = {res: ''}

    try {
      let stmtRes = (await stmts.get.execute(url) || { identifier: void 0 }).identifier
      if (typeof stmtRes === 'undefined') {
        try {
          stmtRes = randomBytes(4).toString('hex')
          await stmts.put.execute(url, stmtRes)
        } catch (_) {
          stmtRes = randomBytes(4).toString('hex')
          await stmts.put.execute(url, stmtRes)
        }
      }
      ctx.res = stmtRes
    } catch (_) {}

    const result = JSON.stringify({ url, result: ctx.res })

    res.writeHead(301, {
      'Location': '/result?type=html&url=' + encodeURIComponent(url),
      'Content-Type': 'application/json',
      'Content-Length': result.length
    })
    res.write(result)
    res.end()
  })
  app.get('/result', async (req, res) => {
    const result = await stmts.get.execute(req.query.url)

    if (typeof result === 'undefined')
      return res.redirect('/')

    const ctx = {
      url: req.query.url,
      res: result.identifier
    }

    if (!req.query.type || req.query.type.toLowerCase() === 'html')
      return res.render('result', ctx)

    else if (req.query.type.toLowerCase() === 'json')
      return res.json(ctx)

    res.status(400).json({
      message: 'Type not supported',
      type: req.query.type
    })
  })
  app.use(async (req, res) => {
    if (req.method !== 'GET') return res.status(400).json({
      message: 'Method not allowed'
    })

    const result = await stmts.getUrl.execute(req.url.substring(1))

    if (!result)
      return res.redirect('/')

    stmts.use.execute(result.id)
    res.redirect(result.url)
  })

  const server = app.listen(3000, () => log('main', 'Now listening on: http://localhost:%s', (<AddressInfo>server.address()).port))
})()
