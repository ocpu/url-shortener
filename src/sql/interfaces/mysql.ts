import { Interface } from '../interface'
import { parse } from 'url'
import { Connection, Statement } from '../index'
import { log } from '../../util';

class MySQLStatement<T> implements Statement<T> {

  constructor(private connection: import('mysql2').Connection, private sql: string) {}

  execute(value: any[]): Promise<T>
  execute(...value: any): Promise<T>
  execute(...rest: any) {
    return this.executeToList(...rest).then(([res]) => res)
  }
  executeToList(value: any[]): Promise<T[]>
  executeToList(...value: any): Promise<T[]>
  executeToList(...rest: any) {
    return new Promise((resolve, reject) => {
      this.connection.execute(this.sql, Array.isArray(rest[0]) ? rest[0] : rest, (err, rows) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })
  }
}

class MySQLConnection implements Connection {
  
  constructor(private connection: import('mysql2').Connection, private _catalog: string) {
    connection.connect()
  }

  get catalogs(): string[] {
    return []
  }
  get catalog(): string {
    return this._catalog
  }
  set catalog(catalog: string) {
    this._catalog
    this.execute`USE ${catalog};`
  }
  execute<T = any>(sql: string, value: any[]): Promise<T>
  execute<T = any>(sql: string, ...value: any): Promise<T>
  execute<T = any>(sql: TemplateStringsArray, ...value: any[]): Promise<T>
  execute(sql: any, ...rest: any) {
    return this.executeToList(sql, ...rest).then(([res]) => res)
  }
  executeToList<T = any>(sql: string, value: any[]): Promise<T[]>
  executeToList<T = any>(sql: string, ...value: any): Promise<T[]>
  executeToList<T = any>(sql: TemplateStringsArray, ...value: any[]): Promise<T[]>
  executeToList(sql: any, ...rest: any) {
    if (Array.isArray(sql))
      return this.prepare(sql.join('?')).executeToList(...rest)
    return new Promise((resolve, reject) => {
      this.connection.query(sql, Array.isArray(rest[0]) ? rest[0] : rest, (err, rows) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })
  }
  prepare<T = any>(sql: string): Statement<T> {
    return new MySQLStatement(this.connection, sql)
  }
}

export default <Interface>{
  dsnPrefixes: ['mysql'],
  async create(url, user, password): Promise<Connection> {
    if (typeof user === 'undefined' || typeof password === 'undefined')
      throw new Error('Missing credentials')
    const {hostname, port, ...parsed} = parse('http:' + url, true)
    const [, database] = (parsed.pathname || '/').split('/')
    const connection = (await import('mysql2')).createConnection({
      database,
      user,
      password,
      host: hostname,
      port: port ? parseInt(port) : void 0
    })
    return new MySQLConnection(connection, database || '')
  }
}
