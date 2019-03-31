import { Connection } from './index'

export type Interface = { dsnPrefixes: string[], create(dsn: string): Promise<Connection> }
