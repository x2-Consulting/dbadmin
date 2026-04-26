'use client';
import { useState, useEffect } from 'react';
import { X, Database } from 'lucide-react';
import { useConn } from '@/context/ConnectionContext';
import { useToast } from '@/context/ToastContext';

const CHARSETS = ['utf8mb4', 'utf8', 'latin1', 'ascii'];
const COLLATIONS: Record<string, string[]> = {
  utf8mb4: ['utf8mb4_unicode_ci', 'utf8mb4_general_ci', 'utf8mb4_bin'],
  utf8:    ['utf8_unicode_ci', 'utf8_general_ci', 'utf8_bin'],
  latin1:  ['latin1_swedish_ci', 'latin1_general_ci', 'latin1_bin'],
  ascii:   ['ascii_general_ci', 'ascii_bin'],
};

interface Props { onClose: () => void; onCreated: (db: string) => void; }

export default function CreateDatabase({ onClose, onCreated }: Props) {
  const { connId } = useConn();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [charset, setCharset] = useState('utf8mb4');
  const [collation, setCollation] = useState('utf8mb4_unicode_ci');
  const [isPg, setIsPg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/connections').then(r => r.json()).then(d => {
      const c = (d.connections || []).find((c: { id: string }) => c.id === connId);
      setIsPg(c?.type === 'postgres');
    });
  }, [connId]);

  function onCharsetChange(cs: string) {
    setCharset(cs);
    setCollation(COLLATIONS[cs]?.[0] || '');
  }

  async function create() {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const r = await fetch(`/api/databases?conn=${connId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), charset, collation }),
      });
      const d = await r.json();
      if (d.error) { setError(d.error); return; }
      toast(`Database "${name.trim()}" created`);
      onCreated(name.trim());
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Database className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Create Database</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">{isPg ? 'Creates a new schema' : 'Creates a new database'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Database name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && create()}
              placeholder={isPg ? 'schema_name' : 'database_name'}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {!isPg && (
            <>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Character set</label>
                <select
                  value={charset}
                  onChange={e => onCharsetChange(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {CHARSETS.map(cs => <option key={cs} value={cs}>{cs}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Collation</label>
                <select
                  value={collation}
                  onChange={e => setCollation(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {(COLLATIONS[charset] || []).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </>
          )}

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={create}
            disabled={saving || !name.trim()}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium"
          >
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
