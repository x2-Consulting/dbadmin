'use client';
import { useState } from 'react';
import { X } from 'lucide-react';

interface Column { Field: string; Type: string; Key: string; }
interface Props {
  db: string;
  table: string;
  row: Record<string, unknown> | null;
  structure: Column[];
  pkColumns: string[];
  onClose: () => void;
  onSaved: () => void;
}

export default function RowEditor({ db, table, row, structure, pkColumns, onClose, onSaved }: Props) {
  const isEdit = !!row;
  const [values, setValues] = useState<Record<string, string>>(() => {
    if (!row) return {};
    return Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v === null ? '' : String(v)]));
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fields = structure.length > 0 ? structure : Object.keys(row || {}).map(Field => ({ Field, Type: 'text', Key: '' }));

  async function save() {
    setSaving(true);
    setError('');
    try {
      const url = `/api/databases/${encodeURIComponent(db)}/tables/${encodeURIComponent(table)}`;
      if (isEdit) {
        const pk = Object.fromEntries(pkColumns.map(k => [k, row![k]]));
        const body = { ...values, __pk: pk };
        const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const d = await r.json();
        if (d.error) { setError(d.error); return; }
      } else {
        const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
        const d = await r.json();
        if (d.error) { setError(d.error); return; }
      }
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-gray-800">{isEdit ? 'Edit Row' : 'Insert Row'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {fields.map(col => (
            <div key={col.Field}>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {col.Field}
                {col.Key === 'PRI' && <span className="ml-1 text-yellow-600 text-xs">PK</span>}
                <span className="ml-1 text-gray-400 font-normal">{col.Type}</span>
              </label>
              <input
                type="text"
                value={values[col.Field] ?? ''}
                onChange={e => setValues(v => ({ ...v, [col.Field]: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                placeholder="NULL"
              />
            </div>
          ))}
        </div>

        {error && <div className="px-4 py-2 text-red-600 text-sm bg-red-50 border-t">{error}</div>}

        <div className="flex justify-end gap-2 px-4 py-3 border-t">
          <button onClick={onClose} className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
