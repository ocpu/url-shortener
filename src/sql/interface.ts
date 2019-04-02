import { Connection } from './index'

export type Interface = {
  dsnPrefixes: string[],
  create(dsn: string, username?: string, password?: string): Promise<Connection>
}
