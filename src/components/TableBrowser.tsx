'use client';
import { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import RowEditor from './RowEditor';

interface Props { db: string; table: string; }

export default function TableBrowser({ db, table }: Props) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);
  const [inserting, setInserting] = useState(false);
  const [structure, setStructure] = useState<Array<{ Field: string; Type: string; Key: string }>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch(
        `/api/databases/${encodeURIComponent(db)}/tables/${encodeURIComponent(table)}?page=${page}&pageSize=${pageSize}`
      );
      const d = await r.json();
      if (d.error) { setError(d.error); return; }
      setRows(d.rows);
      setTotal(d.total);
      if (d.rows.length > 0) setColumns(Object.keys(d.rows[0]));
    } finally { setLoading(false); }
  }, [db, table, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [db, table]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch(`/api/databases/${encodeURIComponent(db)}/tables/${encodeURIComponent(table)}/structure`)
      .then(r => r.json())
      .then(d => setStructure(d.columns || []));
  }, [db, table]);

  const pkColumns = structure.filter(c => c.Key === 'PRI').map(c => c.Field);
  function pkOf(row: Record<string, unknown>) {
    if (pkColumns.length > 0) return Object.fromEntries(pkColumns.map(k => [k, row[k]]));
    return Object.fromEntries(Object.entries(row).slice(0, 1));
  }

  async function deleteRow(row: Record<string, unknown>) {
    if (!confirm('Delete this row?')) return;
    const pk = pkOf(row);
    await fetch(
      `/api/databases/${encodeURIComponent(db)}/tables/${encodeURIComponent(table)}`,
      { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pk) }
    );
    load();
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
        <div className="text-sm text-gray-600">
          {total.toLocaleString()} rows
          {totalPages > 1 && ` · page ${page}/${totalPages}`}
        </div>
        <button
          onClick={() => setInserting(true)}
          className="flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
        >
          <Plus className="w-3.5 h-3.5" /> Insert Row
        </button>
      </div>

      {error && <div className="p-3 text-red-600 text-sm bg-red-50">{error}</div>}

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-6 text-gray-400 text-sm">Loading…</div>
        ) : (
          <table className="min-w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-gray-100 z-10">
              <tr>
                <th className="w-16 px-2 py-2 border-b border-gray-200 text-gray-500" />
                {columns.map(c => (
                  <th key={c} className="px-3 py-2 text-left border-b border-gray-200 font-medium text-gray-700 whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-blue-50 group border-b border-gray-100">
                  <td className="px-2 py-1 text-gray-400 whitespace-nowrap">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                      <button onClick={() => setEditRow(row)} className="p-0.5 hover:text-blue-600">
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button onClick={() => deleteRow(row)} className="p-0.5 hover:text-red-600">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  {columns.map(c => (
                    <td key={c} className="px-3 py-1 text-gray-800 max-w-xs truncate">
                      {row[c] === null
                        ? <span className="text-gray-400 italic">NULL</span>
                        : String(row[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-200 bg-gray-50 shrink-0">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {(editRow || inserting) && (
        <RowEditor
          db={db}
          table={table}
          row={editRow}
          structure={structure}
          pkColumns={pkColumns}
          onClose={() => { setEditRow(null); setInserting(false); }}
          onSaved={() => { setEditRow(null); setInserting(false); load(); }}
        />
      )}
    </div>
  );
}
