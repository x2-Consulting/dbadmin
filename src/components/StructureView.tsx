'use client';
import { useState, useEffect } from 'react';

interface Column {
  Field: string; Type: string; Null: string; Key: string; Default: unknown; Extra: string;
}
interface Index {
  Key_name: string; Column_name: string; Non_unique: number; Index_type: string;
}
interface Props { db: string; table: string; }

export default function StructureView({ db, table }: Props) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [indexes, setIndexes] = useState<Index[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/databases/${encodeURIComponent(db)}/tables/${encodeURIComponent(table)}/structure`)
      .then(r => r.json())
      .then(d => { setColumns(d.columns || []); setIndexes(d.indexes || []); })
      .finally(() => setLoading(false));
  }, [db, table]);

  if (loading) return <div className="p-6 text-gray-400 text-sm">Loading…</div>;

  return (
    <div className="overflow-auto p-4 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Columns</h3>
        <table className="min-w-full text-xs border border-gray-200 rounded">
          <thead className="bg-gray-50">
            <tr>
              {['Field', 'Type', 'Null', 'Key', 'Default', 'Extra'].map(h => (
                <th key={h} className="px-3 py-2 text-left font-medium text-gray-600 border-b">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {columns.map(col => (
              <tr key={col.Field} className="border-b hover:bg-gray-50">
                <td className="px-3 py-1.5 font-mono text-gray-800">
                  {col.Key === 'PRI' && <span className="mr-1 text-yellow-500">🔑</span>}
                  {col.Field}
                </td>
                <td className="px-3 py-1.5 text-gray-600 font-mono">{col.Type}</td>
                <td className="px-3 py-1.5 text-gray-500">{col.Null}</td>
                <td className="px-3 py-1.5 text-gray-500">{col.Key}</td>
                <td className="px-3 py-1.5 text-gray-500">{col.Default === null ? <i>NULL</i> : String(col.Default)}</td>
                <td className="px-3 py-1.5 text-gray-500">{col.Extra}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {indexes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Indexes</h3>
          <table className="min-w-full text-xs border border-gray-200 rounded">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Column', 'Type', 'Unique'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-gray-600 border-b">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {indexes.map((idx, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-1.5 font-mono text-gray-800">{idx.Key_name}</td>
                  <td className="px-3 py-1.5 text-gray-600">{idx.Column_name}</td>
                  <td className="px-3 py-1.5 text-gray-500">{idx.Index_type}</td>
                  <td className="px-3 py-1.5 text-gray-500">{idx.Non_unique === 0 ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
