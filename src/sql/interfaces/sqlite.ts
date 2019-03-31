import { Connection, Statement } from '../index'
import { Interface } from '../interface'

class SQLiteStatement<T> implements Statement<T> {

  constructor(private stmt: import('sqlite3').Statement) {}

  execute(value: any[]): Promise<T>
  execute(...value: any): Promise<T>
  execute(...rest: any): Promise<any> {
    return this.executeToList(...rest).then(res => res[0])
  }
  executeToList(value: any[]): Promise<T[]>
  executeToList(...value: any): Promise<T[]>
  executeToList(...rest: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.stmt.all(...rest, (err: Error|null, rows: any[]) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })
  }
}

class SQLiteConnection implements Connection {

  constructor(private db: import('sqlite3').Database) {}

  get catalogs(): string[] {
    return []
  }
  get catalog(): string {
    return 'main'
  }
  set catalog(value: string) {
    throw new Error('Not supported')
  }
  execute<T = any>(sql: string, value: any[]): Promise<T>
  execute<T = any>(sql: string, ...value: any): Promise<T>
  execute<T = any>(sql: TemplateStringsArray, ...value: any): Promise<T>
  execute(sql: any, ...rest: any): Promise<any> {
    return this.executeToList(sql, ...rest).then(res => res[0])
  }
  executeToList<T = any>(sql: string, value: any[]): Promise<T[]>
  executeToList<T = any>(sql: string, ...value: any): Promise<T[]>
  executeToList<T = any>(sql: TemplateStringsArray, ...value: any): Promise<T[]>
  executeToList(sql: any, ...rest: any): Promise<any> {
    if (Array.isArray(sql))
      return this.prepare(sql.join('?')).executeToList(...rest)
    return new Promise((resolve, reject) => {
      this.db.all(sql, ...rest, (err: Error|null, rows: any[]) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })
  }

  prepare<T = any>(sql: string): Statement<T> {
    return new SQLiteStatement<T>(this.db.prepare(sql))
  }
}
export default <Interface>{
  dsnPrefixes: ['sqlite', 'sqlite3'],
  async create(filename): Promise<Connection> {
    const db = new (await import('sqlite3')).Database(filename)
    return new SQLiteConnection(db)
  }
}
