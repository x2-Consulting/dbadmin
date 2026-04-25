'use client';
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Server, Database, Table2, HardDrive } from 'lucide-react';

interface DbRow {
  database: string;
  tableCount: number;
  totalSize: number;
  dataSize: number;
  indexSize: number;
  estimatedRows: number;
}

interface OverviewData {
  server: {
    version: string;
    uptime: number;
    maxConnections: number;
    openConnections: number;
  };
  databases: DbRow[];
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatUptime(secs: number): string {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
      <div className="p-2 bg-blue-50 rounded-lg text-blue-600 shrink-0">{icon}</div>
      <div>
        <div className="text-xs text-gray-500 font-medium">{label}</div>
        <div className="text-lg font-semibold text-gray-800 leading-tight">{value}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function Overview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/stats/overview');
      const d = await r.json();
      if (d.error) { setError(d.error); return; }
      setData(d);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalSize = data?.databases.reduce((s, d) => s + (d.totalSize || 0), 0) ?? 0;
  const totalTables = data?.databases.reduce((s, d) => s + (d.tableCount || 0), 0) ?? 0;

  return (
    <div className="flex flex-col h-full overflow-auto bg-gray-50">
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 sticky top-0 z-10">
        <h2 className="text-base font-semibold text-gray-800">Database Overview</h2>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-gray-400">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="m-6 p-3 text-red-600 bg-red-50 rounded-lg text-sm">{error}</div>}

      {data && (
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Server</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                label="MariaDB Version"
                value={data.server.version}
                icon={<Server className="w-4 h-4" />}
              />
              <StatCard
                label="Uptime"
                value={formatUptime(data.server.uptime)}
                icon={<Server className="w-4 h-4" />}
              />
              <StatCard
                label="Connections"
                value={`${data.server.openConnections} / ${data.server.maxConnections}`}
                sub="open / max"
                icon={<Server className="w-4 h-4" />}
              />
              <StatCard
                label="Total Data Size"
                value={formatBytes(totalSize)}
                sub={`${totalTables} tables`}
                icon={<HardDrive className="w-4 h-4" />}
              />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Databases</h3>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-medium text-gray-600 text-xs">Database</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600 text-xs">Tables</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600 text-xs">Est. Rows</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600 text-xs">Data</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600 text-xs">Indexes</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600 text-xs">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.databases.map((db, i) => (
                    <tr key={db.database} className={`border-b border-gray-100 hover:bg-blue-50/30 ${i === data.databases.length - 1 ? 'border-0' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Database className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="font-medium text-gray-800">{db.database}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        <span className="flex items-center justify-end gap-1">
                          <Table2 className="w-3 h-3 text-gray-400" />
                          {db.tableCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {db.estimatedRows ? `~${db.estimatedRows.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">{formatBytes(db.dataSize)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{formatBytes(db.indexSize)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-medium text-gray-700">{formatBytes(db.totalSize)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading…</div>
      )}
    </div>
  );
}
