// import { Connection } from './types'
// export { Connection, Statement } from './types'

export interface Statement<T = any> {
  execute(value: any[]): Promise<T>
  execute(...value: any): Promise<T>
  executeToList(value: any[]): Promise<T[]>
  executeToList(...value: any): Promise<T[]>
}
export interface Connection {
  readonly catalogs: string[]
  catalog: string
  execute<T = any>(sql: string, value: any[]): Promise<T>
  execute<T = any>(sql: string, ...value: any): Promise<T>
  execute<T = any>(sql: TemplateStringsArray, ...value: any[]): Promise<T>
  executeToList<T = any>(sql: string, value: any[]): Promise<T[]>
  executeToList<T = any>(sql: string, ...value: any): Promise<T[]>
  executeToList<T = any>(sql: TemplateStringsArray, ...value: any[]): Promise<T[]>
  prepare<T = any>(sql: string): Statement<T>
}

import interfaces from './interfaces'

export function createConnection(dsn: string): Promise<Connection> {
  const [prefix, rest] = dsn.split(':', 2)
  const iface = interfaces.find(iface => iface.dsnPrefixes.includes(prefix))

  if (!iface)
    throw new Error('Could not find driver for: ' + dsn)

  return iface.create(rest)
}
