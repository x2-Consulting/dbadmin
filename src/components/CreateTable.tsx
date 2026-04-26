'use client';
import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Key } from 'lucide-react';
import { useConn } from '@/context/ConnectionContext';

const MYSQL_TYPES = [
  'INT', 'BIGINT', 'TINYINT', 'SMALLINT', 'FLOAT', 'DOUBLE', 'DECIMAL(10,2)',
  'VARCHAR(255)', 'TEXT', 'MEDIUMTEXT', 'LONGTEXT', 'CHAR(36)',
  'DATE', 'DATETIME', 'TIMESTAMP', 'BOOLEAN', 'JSON', 'BLOB',
];
const PG_TYPES = [
  'INTEGER', 'BIGINT', 'SMALLINT', 'SERIAL', 'BIGSERIAL', 'FLOAT8', 'NUMERIC(10,2)',
  'VARCHAR(255)', 'TEXT', 'CHAR(36)', 'UUID',
  'DATE', 'TIMESTAMP', 'TIMESTAMPTZ', 'BOOLEAN', 'JSONB', 'BYTEA',
];

interface ColumnDef {
  name: string;
  type: string;
  notNull: boolean;
  pk: boolean;
  autoIncrement: boolean;
  defaultVal: string;
}

interface Props {
  db: string;
  onClose: () => void;
  onCreated: (db: string, table: string) => void;
}

function qi(s: string, pg: boolean) {
  return pg ? `"${s.replace(/"/g, '')}"` : `\`${s.replace(/`/g, '')}\``;
}

function buildSQL(db: string, tableName: string, columns: ColumnDef[], pg: boolean): string {
  if (!tableName.trim() || columns.filter(c => c.name.trim()).length === 0) return '';
  const validCols = columns.filter(c => c.name.trim());
  const pkCols = validCols.filter(c => c.pk);

  const lines = validCols.map(c => {
    let type = c.type;
    let def = `  ${qi(c.name, pg)} ${type}`;
    if (!pg && c.autoIncrement) def += ' AUTO_INCREMENT';
    if (c.notNull) def += ' NOT NULL';
    if (c.defaultVal.trim()) def += ` DEFAULT ${c.defaultVal.trim()}`;
    if (pkCols.length === 1 && c.pk) def += ' PRIMARY KEY';
    return def;
  });

  if (pkCols.length > 1) {
    lines.push(`  PRIMARY KEY (${pkCols.map(c => qi(c.name, pg)).join(', ')})`);
  }

  return `CREATE TABLE ${qi(db, pg)}.${qi(tableName, pg)} (\n${lines.join(',\n')}\n);`;
}

export default function CreateTable({ db, onClose, onCreated }: Props) {
  const { connId } = useConn();
  const [dbType, setDbType] = useState<string>('mysql');
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState<ColumnDef[]>([
    { name: 'id', type: 'INT', notNull: true, pk: true, autoIncrement: true, defaultVal: '' },
    { name: '', type: 'VARCHAR(255)', notNull: false, pk: false, autoIncrement: false, defaultVal: '' },
  ]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/connections')
      .then(r => r.json())
      .then(d => {
        const c = (d.connections || []).find((c: { id: string }) => c.id === connId);
        if (c) {
          setDbType(c.type);
          if (c.type === 'postgres') {
            setColumns([
              { name: 'id', type: 'SERIAL', notNull: true, pk: true, autoIncrement: false, defaultVal: '' },
              { name: '', type: 'VARCHAR(255)', notNull: false, pk: false, autoIncrement: false, defaultVal: '' },
            ]);
          }
        }
      });
  }, [connId]);

  const pg = dbType === 'postgres';
  const typeList = pg ? PG_TYPES : MYSQL_TYPES;
  const sql = buildSQL(db, tableName, columns, pg);

  function addColumn() {
    setColumns(c => [...c, {
      name: '', type: pg ? 'VARCHAR(255)' : 'VARCHAR(255)',
      notNull: false, pk: false, autoIncrement: false, defaultVal: '',
    }]);
  }

  function updateCol(i: number, patch: Partial<ColumnDef>) {
    setColumns(c => c.map((col, idx) => idx === i ? { ...col, ...patch } : col));
  }

  function removeCol(i: number) {
    setColumns(c => c.filter((_, idx) => idx !== i));
  }

  async function create() {
    if (!sql) return;
    setRunning(true);
    setError('');
    try {
      const r = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, conn: connId }),
      });
      const d = await r.json();
      if (d.error) { setError(d.error); return; }
      onCreated(db, tableName.trim());
    } finally { setRunning(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white">Create Table</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              in <span className="text-zinc-300 font-mono">{db}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Table name</label>
            <input
              autoFocus
              value={tableName}
              onChange={e => setTableName(e.target.value)}
              className="w-72 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="table_name"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-zinc-400">Columns</label>
              <button onClick={addColumn} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add column
              </button>
            </div>

            <div className="space-y-2">
              {columns.map((col, i) => (
                <div key={i} className="flex items-center gap-2 bg-zinc-800/60 border border-zinc-700/50 rounded-lg px-3 py-2 flex-wrap">
                  {col.pk && <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />}

                  <input
                    value={col.name}
                    onChange={e => updateCol(i, { name: e.target.value })}
                    placeholder="column_name"
                    className="w-32 bg-transparent text-xs text-white font-mono placeholder-zinc-600 focus:outline-none border-b border-zinc-600 focus:border-blue-500 pb-0.5 transition-colors"
                  />

                  <select
                    value={typeList.includes(col.type) ? col.type : col.type}
                    onChange={e => updateCol(i, { type: e.target.value })}
                    className="bg-zinc-700 text-xs text-zinc-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  >
                    {typeList.map(t => <option key={t} value={t}>{t}</option>)}
                    {!typeList.includes(col.type) && <option value={col.type}>{col.type}</option>}
                  </select>

                  <label className="flex items-center gap-1 text-[11px] text-zinc-500 whitespace-nowrap cursor-pointer">
                    <input type="checkbox" checked={col.notNull} onChange={e => updateCol(i, { notNull: e.target.checked })} className="accent-blue-500" />
                    NOT NULL
                  </label>

                  <label className="flex items-center gap-1 text-[11px] text-zinc-500 whitespace-nowrap cursor-pointer">
                    <input type="checkbox" checked={col.pk} onChange={e => updateCol(i, { pk: e.target.checked })} className="accent-amber-500" />
                    PK
                  </label>

                  {!pg && (
                    <label className="flex items-center gap-1 text-[11px] text-zinc-500 whitespace-nowrap cursor-pointer">
                      <input type="checkbox" checked={col.autoIncrement} onChange={e => updateCol(i, { autoIncrement: e.target.checked })} className="accent-green-500" />
                      AI
                    </label>
                  )}

                  <input
                    value={col.defaultVal}
                    onChange={e => updateCol(i, { defaultVal: e.target.value })}
                    placeholder="default"
                    className="w-20 bg-transparent text-xs text-zinc-400 font-mono placeholder-zinc-600 focus:outline-none border-b border-zinc-700 focus:border-blue-500 pb-0.5 transition-colors"
                  />

                  <button onClick={() => removeCol(i)} className="ml-auto p-1 rounded text-zinc-600 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {sql && (
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Preview SQL</label>
              <pre className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-3 text-xs text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap">{sql}</pre>
            </div>
          )}
        </div>

        {error && (
          <div className="mx-5 mb-2 p-3 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg font-mono">{error}</div>
        )}

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-zinc-800 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={create}
            disabled={running || !sql || !tableName.trim()}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 transition-colors font-medium"
          >
            {running ? 'Creating…' : 'Create Table'}
          </button>
        </div>
      </div>
    </div>
  );
}
