'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Table2, Hash } from 'lucide-react';
import { useConn } from '@/context/ConnectionContext';

interface Result {
  type: 'table' | 'column';
  db: string;
  table: string;
  column?: string;
}

interface Props {
  onNavigate: (db: string, table: string) => void;
  onClose: () => void;
}

export default function SearchPalette({ onNavigate, onClose }: Props) {
  const { connId } = useConn();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&conn=${connId}`);
      const d = await r.json();
      const combined: Result[] = [
        ...(d.tables || []).map((t: { db: string; table: string }) => ({
          type: 'table' as const, db: t.db, table: t.table,
        })),
        ...(d.columns || []).map((c: { db: string; table: string; column: string }) => ({
          type: 'column' as const, db: c.db, table: c.table, column: c.column,
        })),
      ];
      setResults(combined);
      setSelected(0);
    } finally { setLoading(false); }
  }, [connId]);

  function handleInput(v: string) {
    setQuery(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(v), 220);
  }

  function navigate(r: Result) {
    onNavigate(r.db, r.table);
    onClose();
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && results[selected]) navigate(results[selected]);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search tables and columns…"
            className="flex-1 bg-transparent text-white text-sm placeholder-zinc-500 focus:outline-none"
          />
          {loading && (
            <div className="w-3.5 h-3.5 border border-zinc-600 border-t-zinc-300 rounded-full animate-spin shrink-0" />
          )}
          <button onClick={onClose} className="p-1 rounded text-zinc-600 hover:text-zinc-300 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto py-1">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => navigate(r)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === selected ? 'bg-blue-600/20' : 'hover:bg-zinc-800'
                }`}
              >
                {r.type === 'table'
                  ? <Table2 className="w-4 h-4 text-blue-400 shrink-0" />
                  : <Hash className="w-4 h-4 text-purple-400 shrink-0" />}
                <span className="text-xs font-mono text-zinc-500">{r.db}.</span>
                <span className={`text-sm font-medium ${i === selected ? 'text-blue-300' : 'text-zinc-200'}`}>
                  {r.table}
                </span>
                {r.column && (
                  <span className="text-xs text-zinc-500 ml-1">· {r.column}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-zinc-600">
            No matches for &ldquo;{query}&rdquo;
          </div>
        )}

        <div className="px-4 py-2.5 flex items-center justify-between border-t border-zinc-800/60">
          <span className="text-[10px] text-zinc-700">
            {query.length < 2 ? 'Type at least 2 characters' : `${results.length} result${results.length !== 1 ? 's' : ''}`}
          </span>
          <span className="text-[10px] text-zinc-700">↑↓ navigate · ↵ open · esc close</span>
        </div>
      </div>
    </div>
  );
}
