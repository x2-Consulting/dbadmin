'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TableBrowser from '@/components/TableBrowser';
import SqlEditor from '@/components/SqlEditor';
import StructureView from '@/components/StructureView';
import UserManager from '@/components/UserManager';
import Overview from '@/components/Overview';
import LiveStats from '@/components/LiveStats';
import { Table2, Code2, LayoutList } from 'lucide-react';

type TableTab = 'data' | 'structure' | 'sql';

export default function Home() {
  const [selected, setSelected] = useState<{ db: string; table: string } | null>(null);
  const [view, setView] = useState<string>('overview');
  const [tableTab, setTableTab] = useState<TableTab>('data');

  function onSelect(db: string, table: string) {
    setSelected({ db, table });
    setView('table');
    setTableTab('data');
  }

  const isTableView = view === 'table' && selected;

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar
        selected={selected}
        onSelect={onSelect}
        activeView={view}
        onView={setView}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {isTableView && (
          <div className="flex items-center border-b border-gray-200 bg-gray-50 shrink-0 px-1 pt-1">
            <span className="text-xs text-gray-500 px-3 font-mono">
              {selected.db}.<strong>{selected.table}</strong>
            </span>
            <div className="flex">
              {([
                { id: 'data', label: 'Data', icon: <LayoutList className="w-3.5 h-3.5" /> },
                { id: 'structure', label: 'Structure', icon: <Table2 className="w-3.5 h-3.5" /> },
                { id: 'sql', label: 'SQL', icon: <Code2 className="w-3.5 h-3.5" /> },
              ] as { id: TableTab; label: string; icon: React.ReactNode }[]).map(t => (
                <button
                  key={t.id}
                  onClick={() => setTableTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                    tableTab === t.id
                      ? 'border-blue-500 text-blue-600 bg-white'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.icon}{t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          {view === 'overview' && <Overview />}
          {view === 'live' && <LiveStats />}
          {view === 'users' && <UserManager />}
          {view === 'table' && selected && tableTab === 'data' && (
            <TableBrowser db={selected.db} table={selected.table} />
          )}
          {view === 'table' && selected && tableTab === 'structure' && (
            <StructureView db={selected.db} table={selected.table} />
          )}
          {(view === 'table' && tableTab === 'sql') && (
            <SqlEditor db={selected?.db} />
          )}
          {view === 'sql' && <SqlEditor db={selected?.db} />}
        </div>
      </div>
    </div>
  );
}
