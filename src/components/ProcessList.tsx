'use client';
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Zap, Square } from 'lucide-react';
import { useConn } from '@/context/ConnectionContext';
import { useToast } from '@/context/ToastContext';

interface Process {
  id: number; user: string; host: string; db: string | null;
  command: string; time: number; state: string; info: string | null;
}

const REFRESH_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '2s', value: 2000 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
];

function timeColor(t: number) {
  if (t < 1)  return 'text-green-400';
  if (t < 10) return 'text-amber-400';
  return 'text-red-400';
}

export default function ProcessList() {
  const { connId } = useConn();
  const { toast } = useToast();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshMs, setRefreshMs] = useState(5000);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/processes?conn=${connId}`);
      const d = await r.json();
      if (d.error) { setError(d.error); return; }
      setProcesses(d.processes || []);
      setError('');
    } finally { setLoading(false); }
  }, [connId]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  useEffect(() => {
    if (!refreshMs) return;
    const id = setInterval(load, refreshMs);
    return () => clearInterval(id);
  }, [load, refreshMs]);

  async function kill(id: number) {
    if (!confirm(`Kill process ${id}?`)) return;
    const r = await fetch(`/api/processes?conn=${connId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const d = await r.json();
    if (d.error) toast(d.error, 'error');
    else { toast(`Process ${id} killed`); load(); }
  }

  return (
    <div className="flex flex-col h-full bg-[#09090b]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Process List</h2>
          <p className="text-xs text-zinc-500 mt-0.5">{processes.length} active {processes.length === 1 ? 'process' : 'processes'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-600">Auto-refresh:</span>
          <div className="flex gap-1">
            {REFRESH_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setRefreshMs(opt.value)}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                  refreshMs === opt.value
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button onClick={load} disabled={loading} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-40">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && <div className="mx-6 mt-4 p-3 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg text-xs">{error}</div>}

      <div className="flex-1 overflow-auto">
        {loading && processes.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-zinc-600 text-sm gap-2">
            <div className="w-4 h-4 border border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />Loading…
          </div>
        ) : processes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 gap-3">
            <Zap className="w-10 h-10 text-zinc-800" />
            <p className="text-sm text-zinc-600">No active processes</p>
          </div>
        ) : (
          <table className="min-w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800">
              <tr>
                {['ID', 'User', 'Host', 'DB', 'Command', 'Time', 'State', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-medium text-zinc-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {processes.map(p => (
                <>
                  <tr
                    key={p.id}
                    onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                    className="border-b border-zinc-800/60 hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-2.5 font-mono text-zinc-400">{p.id}</td>
                    <td className="px-4 py-2.5 text-zinc-300">{p.user}</td>
                    <td className="px-4 py-2.5 text-zinc-500 font-mono">{p.host}</td>
                    <td className="px-4 py-2.5">
                      {p.db ? <span className="font-mono text-blue-400/80">{p.db}</span> : <span className="text-zinc-700">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-400">{p.command}</td>
                    <td className={`px-4 py-2.5 font-mono font-medium tabular-nums ${timeColor(p.time)}`}>
                      {p.time}s
                    </td>
                    <td className="px-4 py-2.5 text-zinc-500 max-w-[120px] truncate">{p.state}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={e => { e.stopPropagation(); kill(p.id); }}
                        title="Kill process"
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-auto px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/10 rounded-lg transition-all font-medium"
                      >
                        <Square className="w-3 h-3" /> Kill
                      </button>
                    </td>
                  </tr>
                  {expanded === p.id && p.info && (
                    <tr key={`${p.id}-sql`} className="border-b border-zinc-800/60 bg-zinc-900/60">
                      <td colSpan={8} className="px-4 py-3">
                        <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap break-all">{p.info}</pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
