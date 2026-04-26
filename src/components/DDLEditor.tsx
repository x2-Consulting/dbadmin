'use client';
import { useState, useEffect } from 'react';
import { Copy, Play, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useConn } from '@/context/ConnectionContext';

interface Props { db: string; table: string; }

export default function DDLEditor({ db, table }: Props) {
  const { connId } = useConn();
  const [ddl, setDdl] = useState('');
  const [loading, setLoading] = useState(true);
  const [alterSql, setAlterSql] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; error?: string; affectedRows?: number } | null>(null);

  async function loadDdl() {
    setLoading(true);
    try {
      const r = await fetch(
        `/api/databases/${encodeURIComponent(db)}/tables/${encodeURIComponent(table)}/ddl?conn=${connId}`
      );
      const d = await r.json();
      setDdl(d.ddl || d.error || '');
    } finally { setLoading(false); }
  }

  useEffect(() => { loadDdl(); }, [db, table, connId]);

  async function runAlter() {
    if (!alterSql.trim()) return;
    setRunning(true);
    setResult(null);
    try {
      const r = await fetch(
        `/api/databases/${encodeURIComponent(db)}/tables/${encodeURIComponent(table)}/ddl?conn=${connId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: alterSql, conn: connId }),
        }
      );
      const d = await r.json();
      if (d.error) setResult({ error: d.error });
      else { setResult({ ok: true, affectedRows: d.affectedRows }); await loadDdl(); }
    } finally { setRunning(false); }
  }

  return (
    <div className="flex flex-col h-full bg-[#09090b]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 shrink-0">
        <span className="text-xs font-medium text-zinc-400">CREATE TABLE statement</span>
        <div className="flex gap-2">
          <button onClick={() => navigator.clipboard.writeText(ddl)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 px-2 py-1.5 rounded-lg transition-colors">
            <Copy className="w-3 h-3" /> Copy
          </button>
          <button onClick={loadDdl} disabled={loading}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-40">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap bg-zinc-900 border border-zinc-800 rounded-xl p-4 leading-relaxed">
          {loading ? 'Loading…' : (ddl || 'No DDL available')}
        </pre>
      </div>

      <div className="border-t border-zinc-800 p-4 space-y-3 shrink-0">
        <div className="text-xs font-medium text-zinc-400">Run ALTER TABLE</div>
        <div className="flex gap-2">
          <textarea
            value={alterSql}
            onChange={e => setAlterSql(e.target.value)}
            placeholder={`ALTER TABLE \`${table}\` ADD COLUMN …`}
            rows={3}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 resize-none transition-colors"
          />
          <button
            onClick={runAlter}
            disabled={running || !alterSql.trim()}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors self-start"
          >
            <Play className="w-3.5 h-3.5" />
            {running ? 'Running…' : 'Run'}
          </button>
        </div>
        {result?.error && (
          <div className="flex items-start gap-2 p-2.5 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg text-xs">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="font-mono">{result.error}</span>
          </div>
        )}
        {result?.ok && (
          <div className="flex items-center gap-2 p-2.5 text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            Statement executed successfully. Table structure refreshed.
          </div>
        )}
      </div>
    </div>
  );
}
