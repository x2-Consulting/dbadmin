'use client';
import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Database, Table2, Users, BarChart2, Activity, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  selected: { db: string; table: string } | null;
  onSelect: (db: string, table: string) => void;
  activeView: string;
  onView: (view: string) => void;
}

export default function Sidebar({ selected, onSelect, activeView, onView }: Props) {
  const [databases, setDatabases] = useState<string[]>([]);
  const [tables, setTables] = useState<Record<string, string[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/databases')
      .then(r => r.json())
      .then(d => { setDatabases(d.databases || []); setLoading(false); })
      .catch(() => { setError('Cannot connect'); setLoading(false); });
  }, []);

  async function toggleDb(db: string) {
    const next = new Set(expanded);
    if (next.has(db)) { next.delete(db); setExpanded(next); return; }
    next.add(db);
    setExpanded(next);
    if (!tables[db]) {
      const r = await fetch(`/api/databases/${encodeURIComponent(db)}/tables`);
      const d = await r.json();
      setTables(prev => ({ ...prev, [db]: d.tables || [] }));
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  const topNav = [
    { id: 'overview', label: 'Overview', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'live', label: 'Live Stats', icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-56 bg-gray-900 text-gray-200 flex flex-col h-full border-r border-gray-700">
      <div className="px-3 py-3 text-sm font-semibold text-white border-b border-gray-700 flex items-center gap-2">
        <Database className="w-4 h-4 text-blue-400" />
        DB Admin
      </div>

      <div className="flex-1 overflow-y-auto text-sm">
        {/* Top-level nav */}
        <div className="px-2 pt-2 pb-1">
          {topNav.map(item => (
            <button
              key={item.id}
              onClick={() => onView(item.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left mb-0.5 transition-colors ${
                activeView === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Databases
        </div>

        {loading && <div className="px-3 py-2 text-gray-500 text-xs">Connecting…</div>}
        {error && <div className="px-3 py-2 text-red-400 text-xs">{error}</div>}

        {databases.map(db => (
          <div key={db}>
            <button
              onClick={() => toggleDb(db)}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-800 text-left"
            >
              {expanded.has(db)
                ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-gray-400" />}
              <Database className="w-3.5 h-3.5 shrink-0 text-blue-400" />
              <span className="truncate">{db}</span>
            </button>

            {expanded.has(db) && (tables[db] || []).map(t => (
              <button
                key={t}
                onClick={() => { onSelect(db, t); onView('table'); }}
                className={`w-full flex items-center gap-1.5 pl-8 pr-3 py-1 text-left hover:bg-gray-800 ${
                  selected?.db === db && selected?.table === t && activeView === 'table'
                    ? 'bg-blue-900/50 text-blue-300'
                    : 'text-gray-300'
                }`}
              >
                <Table2 className="w-3 h-3 shrink-0 text-gray-500" />
                <span className="truncate text-xs">{t}</span>
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="border-t border-gray-700">
        <button
          onClick={() => onView('users')}
          className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-800 transition-colors ${
            activeView === 'users' ? 'bg-blue-900/50 text-blue-300' : 'text-gray-300'
          }`}
        >
          <Users className="w-4 h-4" />
          User Management
        </button>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors border-t border-gray-700"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
