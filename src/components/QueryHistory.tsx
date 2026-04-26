'use client';
import { useState, useEffect, useCallback } from 'react';
import { Clock, Trash2, Play, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import type { HistoryEntry } from '@/lib/history';

interface Props {
  onReplay: (sql: string, db?: string) => void;
}

function fmt(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function relTime(ts: number): string {
  const d = Date.now() - ts;
  if (d < 60_000) return 'just now';
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export default function QueryHistory({ onReplay }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/query/history');
    const d = await r.json();
    setHistory(d.history || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function clear() {
    if (!confirm('Clear all query history?')) return;
    await fetch('/api/query/history', { method: 'DELETE' });
    setHistory([]);
  }

  return (
    <div className="flex flex-col h-full bg-[#09090b]">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 shrink-0">
        <span className="text-xs font-medium text-zinc-300">Query History</span>
        <div className="flex gap-2">
          <button onClick={load} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {history.length > 0 && (
            <button onClick={clear} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 hover:bg-red-500/10 px-2 py-1.5 rounded-lg transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-32 text-zinc-600 text-sm gap-2">
            <div className="w-4 h-4 border border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
          </div>
        )}
        {!loading && history.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-600 text-sm gap-2">
            <Clock className="w-8 h-8 opacity-30" />
            <span>No queries yet</span>
          </div>
        )}
        {history.map(entry => (
          <div key={entry.id} className="group flex items-start gap-3 px-4 py-3 border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors">
            <div className="mt-0.5 shrink-0">
              {entry.error
                ? <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                : <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <pre className="text-xs text-zinc-200 font-mono whitespace-pre-wrap break-all line-clamp-3">
                {entry.sql}
              </pre>
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-zinc-600">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmt(entry.elapsed)}</span>
                {entry.db && <span className="font-mono text-blue-500/70">{entry.db}</span>}
                {entry.rowCount !== undefined && <span>{entry.rowCount} rows</span>}
                {entry.affectedRows !== undefined && <span>{entry.affectedRows} affected</span>}
                {entry.error && <span className="text-red-400 truncate">{entry.error}</span>}
                <span className="ml-auto">{relTime(entry.ts)}</span>
              </div>
            </div>
            <button
              onClick={() => onReplay(entry.sql, entry.db)}
              className="opacity-0 group-hover:opacity-100 shrink-0 p-1.5 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
              title="Replay in SQL editor"
            >
              <Play className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
