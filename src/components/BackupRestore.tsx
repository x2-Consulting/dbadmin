'use client';
import { useState, useEffect, useRef } from 'react';
import { Download, Upload, AlertCircle, CheckCircle2, Database, ShieldAlert, Loader2, RefreshCw } from 'lucide-react';
import { useConn } from '@/context/ConnectionContext';

interface ConnInfo { id: string; name: string; type: string; readonly?: boolean; }

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BackupRestore() {
  const { connId } = useConn();
  const [databases, setDatabases] = useState<string[]>([]);
  const [connInfo, setConnInfo] = useState<ConnInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState<string | null>(null);
  const [restoreDb, setRestoreDb] = useState<string>('');
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<{ ok?: boolean; executed?: number; error?: string } | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const [dbRes, connRes] = await Promise.all([
      fetch(`/api/databases?conn=${connId}`).then(r => r.json()),
      fetch('/api/connections').then(r => r.json()),
    ]);
    setDatabases(dbRes.databases || []);
    const c = (connRes.connections || []).find((c: ConnInfo) => c.id === connId);
    setConnInfo(c ?? null);
    if (dbRes.databases?.length && !restoreDb) setRestoreDb(dbRes.databases[0]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [connId]);

  async function backup(db: string) {
    setBackingUp(db);
    try {
      const url = `/api/databases/${encodeURIComponent(db)}/backup?conn=${connId}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = `${db}-${new Date().toISOString().slice(0, 10)}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setTimeout(() => setBackingUp(null), 1500);
    }
  }

  async function restore() {
    if (!restoreFile || !restoreDb) return;
    setRestoring(true);
    setRestoreResult(null);
    setConfirmRestore(false);

    const fd = new FormData();
    fd.append('file', restoreFile);

    try {
      const r = await fetch(
        `/api/databases/${encodeURIComponent(restoreDb)}/restore?conn=${connId}`,
        { method: 'POST', body: fd }
      );
      const d = await r.json();
      setRestoreResult(d);
    } catch (e: unknown) {
      setRestoreResult({ error: (e as Error).message });
    } finally {
      setRestoring(false);
    }
  }

  const isReadonly = connInfo?.readonly;

  return (
    <div className="flex flex-col h-full bg-[#09090b] overflow-auto">
      <div className="px-6 py-4 border-b border-zinc-800 shrink-0">
        <h2 className="text-sm font-semibold text-zinc-100">Backup &amp; Restore</h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Programmatic SQL dump — for large or production databases prefer <code className="font-mono text-zinc-400">mysqldump</code> / <code className="font-mono text-zinc-400">pg_dump</code>
        </p>
      </div>

      <div className="flex-1 p-6 space-y-6 max-w-3xl">
        {/* Backup */}
        <div className="border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-zinc-100 flex items-center gap-2">
                <Download className="w-4 h-4 text-blue-400" /> Backup
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Download a full SQL dump (DDL + data) for any database
              </p>
            </div>
            <button onClick={load} disabled={loading}
              className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-40">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="divide-y divide-zinc-800/60">
            {loading ? (
              <div className="px-5 py-4 flex items-center gap-2 text-xs text-zinc-600">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading databases…
              </div>
            ) : databases.length === 0 ? (
              <div className="px-5 py-4 text-xs text-zinc-600">No databases found</div>
            ) : (
              databases.map(db => (
                <div key={db} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-800/20 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <Database className="w-4 h-4 text-blue-500/70" />
                    <span className="text-sm font-mono text-zinc-200">{db}</span>
                  </div>
                  <button
                    onClick={() => backup(db)}
                    disabled={backingUp === db}
                    className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    {backingUp === db
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing…</>
                      : <><Download className="w-3.5 h-3.5" /> Download .sql</>}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Restore */}
        <div className="border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-900/40">
            <h3 className="text-sm font-medium text-zinc-100 flex items-center gap-2">
              <Upload className="w-4 h-4 text-amber-400" /> Restore
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Execute a SQL file against a database. <strong className="text-zinc-400">Existing data is not automatically cleared</strong> — use <code className="font-mono">DROP TABLE</code> statements in your dump if needed.
            </p>
          </div>

          <div className="p-5 space-y-4">
            {isReadonly && (
              <div className="flex items-center gap-2 p-3 text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                This connection is read-only. Restore is disabled.
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Target database</label>
                <select
                  value={restoreDb}
                  onChange={e => setRestoreDb(e.target.value)}
                  disabled={isReadonly}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                >
                  {databases.map(db => <option key={db} value={db}>{db}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">SQL file <span className="text-zinc-600">(max 100 MB)</span></label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".sql,.gz"
                  disabled={isReadonly}
                  onChange={e => {
                    setRestoreFile(e.target.files?.[0] ?? null);
                    setRestoreResult(null);
                    setConfirmRestore(false);
                  }}
                  className="w-full text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-zinc-700 file:text-zinc-200 hover:file:bg-zinc-600 disabled:opacity-50 transition-colors"
                />
                {restoreFile && (
                  <p className="text-[10px] text-zinc-600 mt-1">{restoreFile.name} · {fmtBytes(restoreFile.size)}</p>
                )}
              </div>
            </div>

            {restoreFile && !confirmRestore && !restoreResult && !isReadonly && (
              <div className="flex items-start gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs text-amber-300">
                  <p className="font-medium">This will execute all SQL in <code className="font-mono">{restoreFile.name}</code> against <code className="font-mono">{restoreDb}</code>.</p>
                  <p className="text-amber-400/70 mt-0.5">Statements that fail will roll back the entire file on PostgreSQL. On MySQL each statement is committed individually.</p>
                </div>
                <button
                  onClick={() => setConfirmRestore(true)}
                  className="shrink-0 text-xs bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                >
                  I understand, restore
                </button>
              </div>
            )}

            {confirmRestore && !restoring && !restoreResult && (
              <div className="flex items-center gap-3">
                <button
                  onClick={restore}
                  className="flex items-center gap-1.5 text-xs bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  <Upload className="w-3.5 h-3.5" /> Execute restore now
                </button>
                <button
                  onClick={() => setConfirmRestore(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-200 px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {restoring && (
              <div className="flex items-center gap-2.5 text-xs text-zinc-400 p-3 bg-zinc-800/50 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                Executing SQL… this may take a while for large files.
              </div>
            )}

            {restoreResult?.ok && (
              <div className="flex items-start gap-2 p-3.5 text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Restore completed successfully</p>
                  {restoreResult.executed !== undefined && (
                    <p className="text-green-500/70 mt-0.5">~{restoreResult.executed} statement(s) executed into <code className="font-mono">{restoreDb}</code></p>
                  )}
                </div>
              </div>
            )}

            {restoreResult?.error && (
              <div className="flex items-start gap-2 p-3.5 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Restore failed</p>
                  <p className="font-mono mt-0.5 whitespace-pre-wrap">{restoreResult.error}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-zinc-700 space-y-1 border border-zinc-800/50 rounded-xl p-4">
          <p className="text-zinc-500 font-medium">Limitations</p>
          <ul className="space-y-0.5 list-disc list-inside">
            <li>Stored procedures, triggers, and events are not included in backups</li>
            <li>Binary/BLOB columns are hex-encoded — large BLOBs will inflate file size</li>
            <li>Restore files larger than 100 MB should use CLI tools instead</li>
            <li>The PostgreSQL CREATE TABLE is reconstructed — use <code className="font-mono text-zinc-500">pg_dump</code> for exact fidelity</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
