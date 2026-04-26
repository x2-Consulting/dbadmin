import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { Pool as PgPool } from 'pg';
import { encryptPassword, decryptPassword } from './crypto';

export type DbType = 'mariadb' | 'mysql' | 'postgres';
export type SslMode = 'disable' | 'require' | 'verify';

export interface ConnectionConfig {
  id: string;
  name: string;
  type: DbType;
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
  ssl?: boolean;
  sslMode?: SslMode;
  readonly?: boolean;
}

export interface ConnPool {
  config: ConnectionConfig;
  mysql?: mysql.Pool;
  pg?: PgPool;
}

const DATA_FILE = path.join(process.cwd(), 'data', 'connections.json');
const pools = new Map<string, ConnPool>();

function defaultConn(): ConnectionConfig {
  return {
    id: 'default',
    name: process.env.DB_NAME || 'Local (default)',
    type: 'mariadb',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    readonly: process.env.DB_READONLY === 'true',
  };
}

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');
}

function decryptConfig(conn: ConnectionConfig): ConnectionConfig {
  return { ...conn, password: decryptPassword(conn.password) };
}

export function listConnections(): ConnectionConfig[] {
  try {
    ensureDataFile();
    const saved: ConnectionConfig[] = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return [defaultConn(), ...saved.map(decryptConfig)];
  } catch {
    return [defaultConn()];
  }
}

export function saveConnection(conn: ConnectionConfig): void {
  ensureDataFile();
  const existing = listConnections().filter(c => c.id !== 'default' && c.id !== conn.id);
  const toStore = { ...conn, password: encryptPassword(conn.password) };
  const existingStored = existing.map(c => ({ ...c, password: encryptPassword(c.password) }));
  fs.writeFileSync(DATA_FILE, JSON.stringify([...existingStored, toStore], null, 2));
}

export function removeConnection(id: string): void {
  ensureDataFile();
  const raw: ConnectionConfig[] = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  fs.writeFileSync(DATA_FILE, JSON.stringify(raw.filter(c => c.id !== id), null, 2));
  const p = pools.get(id);
  if (p?.mysql) p.mysql.end().catch(() => {});
  if (p?.pg) p.pg.end().catch(() => {});
  pools.delete(id);
}

function sslOptions(config: ConnectionConfig): object | undefined {
  const mode = config.sslMode ?? (config.ssl ? 'require' : 'disable');
  if (mode === 'disable') return undefined;
  return { rejectUnauthorized: mode === 'verify' };
}

export async function getConnPool(id = 'default'): Promise<ConnPool> {
  if (pools.has(id)) return pools.get(id)!;

  const config = listConnections().find(c => c.id === id);
  if (!config) throw new Error(`Connection '${id}' not found`);

  const ssl = sslOptions(config);

  if (config.type === 'postgres') {
    const pg = new PgPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database || 'postgres',
      ssl: ssl as import('pg').PoolConfig['ssl'],
      max: 10,
    });
    const pool: ConnPool = { config, pg };
    pools.set(id, pool);
    return pool;
  } else {
    const pool: ConnPool = {
      config,
      mysql: mysql.createPool({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        multipleStatements: true,
        waitForConnections: true,
        connectionLimit: 10,
        timezone: '+00:00',
        ssl: ssl as Record<string, unknown>,
      }),
    };
    pools.set(id, pool);
    return pool;
  }
}
