const bodyParser = require('body-parser')
const sqlite3 = require('sqlite3')
const crypto = require('crypto')
const path = require('path')
const http = require('http')
const util = require('util')
const old_fs = require('fs')

const fs = {
  readFile: util.promisify(old_fs.readFile)
}

const db = new sqlite3.Database(path.resolve(__dirname, 'db.sqlite3'))
db._run = db.run.bind(db)
db._prepare = db.prepare.bind(db)

db.run = util.promisify(db._run)
const _decoder = bodyParser.urlencoded({extended:true})
const parseBody = (req, res) => new Promise((resolve, reject) => {
  _decoder(req, res, err => {
    if (err) reject(err)
    else resolve()
  })
})

const log = (marker, ...message) => {
  const date = new Date
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')
  const second = date.getSeconds().toString().padStart(2, '0')

  const appendix = typeof message[0] === 'string' && message[0].includes('%s') ? ' ' + message.shift() : ''

  console.log(
    '\x1b[90m%s-%s-%s %s:%s:%s \x1b[35m[%s]\x1b[0m:' + appendix,
    year, month, day, hour, minute, second, marker, ...message
  )
}

const execute = (ctx, ...params) => new Promise((resolve, reject) => {
  ctx.all(...params, (err, rows) => {
    if (err) reject(err)
    else resolve(rows)
  })
})

;(async function() {
  await execute(db, `
  CREATE TABLE IF NOT EXISTS shorts (
    identifier TEXT,
    url TEXT,

    UNIQUE(identifier, url)
  );
  `)
  const stmtGet = db.prepare(`SELECT identifier FROM shorts WHERE url = ?`)
  const stmtGetUrl = db.prepare(`SELECT url FROM shorts WHERE identifier = ?`)
  const stmtPut = await db.prepare(`INSERT INTO shorts (url, identifier) VALUES (?, ?)`)
  
  const server = http.createServer(async (req, res) => {
    log('request', 'Method: %s, URL: %s', req.method, req.url)
    if (req.url === '/') {
      if (req.method === 'GET') {
        const index = await fs.readFile(path.resolve(__dirname, 'index.html'), 'utf8')
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'Content-Length': index.length
        })
        res.write(index)
        res.end()
        return
      } else if (req.method === 'POST') {
        await parseBody(req, res)
        log('debug', req.body)
        const { url } = req.body
        const ctx = {}

        try {
          let [stmtRes] = await execute(stmtGet, url)
          if (typeof stmtRes === 'undefined') {
            try {
              stmtRes = crypto.randomBytes(4).toString('hex')
              await execute(stmtPut, url, stmtRes)
            } catch (_) {
              stmtRes = crypto.randomBytes(4).toString('hex')
              await execute(stmtPut, url, stmtRes)
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
        return
      }
    } else if (req.url.startsWith('/result') && req.method === 'GET') {
      const qs = require('url').parse(req.url, true).query
      if (!qs.type) qs.type = 'html'
      const ctx = {
        url: qs.url,
        res: (await execute(stmtGet, qs.url))[0].identifier
      }
      log('debug', 'Generating %s result', qs.type)
      log('debug', 'With context:', ctx)

      const result = 
        qs.type === 'html' ? (await fs.readFile(path.resolve(__dirname, 'result.html'), 'utf8'))
          .replace(/\{\{\s*([\w\d_:]+)\s*\}\}/g, (match, word) => word in ctx ? ctx[word] : match) :
        qs.type === 'json' ? JSON.stringify(ctx) : 
        'Result created'

      res.writeHead(200, {
        'Content-Type': 
          qs.type === 'html' ? 'text/html' :
          qs.type === 'json' ? 'application/json' :
          'text/plain',
        'Content-Length': result.length
      })
      res.write(result)
      res.end()
      return
    } else if (req.url.startsWith('/static')) {
      const { pathname } = require('url').parse(req.url)
      if (pathname.includes('..')) {
        res.writeHead(404)
        res.end()
        return
      }
      const filepath = path.resolve(__dirname, ...pathname.split('/').filter(Boolean))
      if (!old_fs.existsSync(filepath)) {
        res.writeHead(404)
        res.end()
        return
      }
      res.writeHead(200, {
        'Content-Type': 
          filepath.endsWith('.html') ? 'text/html' :
          filepath.endsWith('.json') ? 'application/json' :
          filepath.endsWith('.js') ? 'text/javascript' :
          filepath.endsWith('.css') ? 'text/css' :
          'text/plain',
      })
      old_fs.createReadStream(filepath).pipe(res)
      return
    }

    if (req.method !== 'GET') {
      log('debug', 'Method not allowed')
      const json = JSON.stringify({
        code: 0,
        message: 'Method not allowed',
      })
      res.writeHead(403, {
        'Content-Type': 'application/json',
        'Content-Length': json.length
      })
      res.write(json)
      res.end()
      return
    }

    const [stmtRes] = await execute(stmtGetUrl, req.url.substring(1))
    log('debug', stmtRes)
    if (typeof stmtRes === 'undefined') {
      res.writeHead(301, { 'Location': '/' })
      res.end()
      return
    }

    res.writeHead(301, { 'Location': stmtRes.url })
    res.end()
  })
  
  server.listen(process.env.SHORTNER_PORT || 3000, () => log('main', 'Now listening on: http://localhost:%s', server.address().port))
  process.on('error', err => {
    log('error', err)
  })
})()
