'use client';
import { useState, useEffect } from 'react';
import { Trash2, Play, Bookmark, RefreshCw } from 'lucide-react';

interface SavedQuery {
  id: string;
  name: string;
  sql: string;
  db?: string;
  ts: number;
}

interface Props {
  onReplay: (sql: string, db?: string) => void;
}

function reltime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function SavedQueries({ onReplay }: Props) {
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/query/saved');
      const d = await r.json();
      setQueries(d.queries || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    await fetch('/api/query/saved', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setQueries(q => q.filter(x => x.id !== id));
  }

  return (
    <div className="flex flex-col h-full bg-[#09090b]">
      <div className="px-6 py-4 border-b border-zinc-800 shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Saved Queries</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {queries.length} {queries.length === 1 ? 'query' : 'queries'} saved
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-zinc-600 text-sm gap-2">
            <div className="w-4 h-4 border border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
            Loading…
          </div>
        ) : queries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 gap-3 text-center px-8">
            <Bookmark className="w-10 h-10 text-zinc-800" />
            <p className="text-sm text-zinc-600">No saved queries yet</p>
            <p className="text-xs text-zinc-700 leading-relaxed">
              Open the SQL editor and click the bookmark icon in the toolbar to save a query here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {queries.map(q => (
              <div key={q.id} className="group px-6 py-4 hover:bg-zinc-800/20 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-medium text-zinc-200">{q.name}</span>
                      {q.db && (
                        <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded">
                          {q.db}
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-700 ml-auto">{reltime(q.ts)}</span>
                    </div>
                    <pre className="text-xs text-zinc-500 font-mono truncate whitespace-pre-wrap line-clamp-2">
                      {q.sql.slice(0, 200)}{q.sql.length > 200 ? '…' : ''}
                    </pre>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                    <button
                      onClick={() => onReplay(q.sql, q.db)}
                      title="Open in SQL editor"
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-green-400 hover:bg-green-500/10 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => remove(q.id)}
                      title="Delete"
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
