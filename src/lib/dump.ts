import type { ConnPool } from './connections';
import { listTables, listViews, getCreateStatement } from './adapter';

const isPg = (p: ConnPool) => p.config.type === 'postgres';

function qi(name: string, pg: boolean) {
  const safe = name.replace(/[^\w$]/g, '');
  return pg ? `"${safe}"` : `\`${safe}\``;
}

function escapeValue(val: unknown, pg: boolean): string {
  if (val === null || val === undefined) return 'NULL';
  if (Buffer.isBuffer(val)) return pg ? `'\\x${val.toString('hex')}'` : `X'${val.toString('hex')}'`;
  if (typeof val === 'boolean') return pg ? (val ? 'TRUE' : 'FALSE') : (val ? '1' : '0');
  if (typeof val === 'number' || typeof val === 'bigint') return String(val);
  if (val instanceof Date) return `'${val.toISOString().replace('T', ' ').slice(0, 23)}'`;
  if (typeof val === 'object') return escapeStr(JSON.stringify(val), pg);
  return escapeStr(String(val), pg);
}

function escapeStr(s: string, pg: boolean): string {
  if (pg) return "'" + s.replace(/'/g, "''") + "'";
  // MySQL: escape backslash and single quote
  return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\x00/g, '\\0').replace(/\n/g, '\\n').replace(/\r/g, '\\r') + "'";
}

async function getViewDefinition(pool: ConnPool, db: string, view: string): Promise<string | null> {
  try {
    if (isPg(pool)) {
      const { rows } = await pool.pg!.query<{ view_definition: string }>(
        `SELECT view_definition FROM information_schema.views WHERE table_schema = $1 AND table_name = $2`,
        [db, view]
      );
      if (!rows[0]?.view_definition) return null;
      return `CREATE OR REPLACE VIEW ${qi(db, true)}.${qi(view, true)} AS\n${rows[0].view_definition}`;
    }
    const q = qi(db, false) + '.' + qi(view, false);
    const [[row]] = await pool.mysql!.query(`SHOW CREATE VIEW ${q}`) as [Array<Record<string, string>>, unknown];
    const def = row['Create View'] || '';
    // Strip DEFINER clause for portability
    return def.replace(/^CREATE\s+(\/\*[^*]*\*\/\s+)?ALGORITHM=\w+\s+DEFINER=`[^`]+`@`[^`]+`\s+SQL SECURITY \w+\s+/, 'CREATE OR REPLACE ');
  } catch { return null; }
}

const BATCH = 500;

async function* tableRows(pool: ConnPool, db: string, table: string): AsyncGenerator<unknown[]> {
  const pg = isPg(pool);
  const q = qi(db, pg) + '.' + qi(table, pg);
  let offset = 0;
  while (true) {
    let rows: unknown[];
    if (pg) {
      const res = await pool.pg!.query(`SELECT * FROM ${q} LIMIT $1 OFFSET $2`, [BATCH, offset]);
      rows = res.rows;
    } else {
      const [r] = await pool.mysql!.query(`SELECT * FROM ${q} LIMIT ${BATCH} OFFSET ${offset}`) as [unknown[], unknown];
      rows = r as unknown[];
    }
    if (!rows.length) break;
    yield rows;
    if (rows.length < BATCH) break;
    offset += BATCH;
  }
}

export async function* generateDump(pool: ConnPool, db: string): AsyncGenerator<string> {
  const pg = isPg(pool);
  const now = new Date().toISOString();
  const dbType = pool.config.type;

  yield `-- DB Admin Backup\n`;
  yield `-- Database: ${db}\n`;
  yield `-- Server type: ${dbType}\n`;
  yield `-- Generated: ${now}\n`;
  yield `-- Restore with: psql / mysql (DO NOT use with a different DB type)\n\n`;

  if (pg) {
    yield `SET search_path = ${qi(db, true)};\n\n`;
  } else {
    yield `/*!40101 SET NAMES utf8mb4 */;\n`;
    yield `SET FOREIGN_KEY_CHECKS = 0;\n\n`;
  }

  const tables = await listTables(pool, db);
  const views = await listViews(pool, db);

  for (const table of tables) {
    yield `-- -----------------------------------------------\n`;
    yield `-- Table: ${table}\n`;
    yield `-- -----------------------------------------------\n\n`;

    const ddl = await getCreateStatement(pool, db, table);
    if (pg) {
      yield `DROP TABLE IF EXISTS ${qi(db, true)}.${qi(table, true)} CASCADE;\n`;
      yield `${ddl}\n\n`;
    } else {
      yield `DROP TABLE IF EXISTS ${qi(table, false)};\n`;
      yield `${ddl};\n\n`;
    }

    let rowCount = 0;
    let firstBatch = true;

    for await (const batch of tableRows(pool, db, table)) {
      const rows = batch as Record<string, unknown>[];
      if (!rows.length) break;

      const cols = Object.keys(rows[0]);
      const colList = cols.map(c => qi(c, pg)).join(', ');
      const tRef = pg ? `${qi(db, true)}.${qi(table, true)}` : qi(table, false);

      if (firstBatch) {
        yield `-- Data\n`;
        firstBatch = false;
      }

      const vals = rows.map(row =>
        '(' + cols.map(c => escapeValue(row[c], pg)).join(', ') + ')'
      ).join(',\n');

      yield `INSERT INTO ${tRef} (${colList}) VALUES\n${vals};\n`;
      rowCount += rows.length;
    }

    if (rowCount > 0) yield `-- ${rowCount} row(s)\n`;
    yield '\n';
  }

  for (const view of views) {
    const def = await getViewDefinition(pool, db, view);
    if (!def) continue;
    yield `-- -----------------------------------------------\n`;
    yield `-- View: ${view}\n`;
    yield `-- -----------------------------------------------\n\n`;
    if (pg) {
      yield `DROP VIEW IF EXISTS ${qi(db, true)}.${qi(view, true)} CASCADE;\n`;
    } else {
      yield `DROP VIEW IF EXISTS ${qi(view, false)};\n`;
    }
    yield `${def};\n\n`;
  }

  if (!pg) yield `SET FOREIGN_KEY_CHECKS = 1;\n`;
  yield `-- End of dump\n`;
}
