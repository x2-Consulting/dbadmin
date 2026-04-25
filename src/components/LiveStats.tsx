'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Pause, Play, Wifi, WifiOff } from 'lucide-react';

interface Snapshot {
  stats: Record<string, number>;
  ts: number;
}

interface Rate {
  queries: number;
  selects: number;
  inserts: number;
  updates: number;
  deletes: number;
  bytesSent: number;
  bytesReceived: number;
  slowQueries: number;
  threadsConnected: number;
  threadsRunning: number;
  bufferHitRate: number;
}

function fmt(n: number, dec = 1): string {
  if (n === -1) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toFixed(dec);
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes.toFixed(0)} B/s`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB/s`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB/s`;
}

function Metric({
  label, value, sub, highlight = false,
}: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-1 ${
      highlight ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
    }`}>
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${highlight ? 'text-blue-700' : 'text-gray-800'}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

export default function LiveStats() {
  const [rate, setRate] = useState<Rate | null>(null);
  const [running, setRunning] = useState(true);
  const [connected, setConnected] = useState(true);
  const [error, setError] = useState('');
  const prev = useRef<Snapshot | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const r = await fetch('/api/stats/live');
      const d = await r.json();
      if (d.error) { setError(d.error); setConnected(false); return; }
      setConnected(true);
      setError('');

      const curr: Snapshot = { stats: d.stats, ts: d.ts };
      if (prev.current) {
        const elapsed = (curr.ts - prev.current.ts) / 1000;
        if (elapsed > 0) {
          const delta = (key: string) => (curr.stats[key] - (prev.current!.stats[key] ?? 0)) / elapsed;
          const poolReqs = curr.stats['innodb_buffer_pool_read_requests'];
          const poolReads = curr.stats['innodb_buffer_pool_reads'];
          const hitRate = poolReqs > 0 ? ((poolReqs - poolReads) / poolReqs) * 100 : -1;

          setRate({
            queries: Math.max(0, delta('queries')),
            selects: Math.max(0, delta('com_select')),
            inserts: Math.max(0, delta('com_insert')),
            updates: Math.max(0, delta('com_update')),
            deletes: Math.max(0, delta('com_delete')),
            bytesSent: Math.max(0, delta('bytes_sent')),
            bytesReceived: Math.max(0, delta('bytes_received')),
            slowQueries: Math.max(0, delta('slow_queries')),
            threadsConnected: curr.stats['threads_connected'],
            threadsRunning: curr.stats['threads_running'],
            bufferHitRate: hitRate,
          });
        }
      }
      prev.current = curr;
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    if (!running) return;

    poll();
    timerRef.current = setInterval(poll, 2000);

    function onVisibility() {
      if (document.visibilityState === 'visible') {
        prev.current = null; // reset delta on return
        poll();
        timerRef.current = setInterval(poll, 2000);
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [running, poll]);

  function toggle() {
    if (running) {
      if (timerRef.current) clearInterval(timerRef.current);
      setRunning(false);
    } else {
      prev.current = null;
      setRunning(true);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-auto bg-gray-50">
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-800">Live Stats</h2>
          <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
            connected && running
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {connected && running
              ? <><Wifi className="w-3 h-3" /> Live</>
              : <><WifiOff className="w-3 h-3" /> Paused</>}
          </div>
          {running && <span className="text-xs text-gray-400">polls every 2s · stops when tab is hidden</span>}
        </div>
        <button
          onClick={toggle}
          className="flex items-center gap-1.5 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
        >
          {running ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Resume</>}
        </button>
      </div>

      {error && <div className="m-6 p-3 text-red-600 bg-red-50 rounded-lg text-sm">{error}</div>}

      <div className="p-6 space-y-6">
        {!rate && (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm gap-2">
            <Activity className="w-4 h-4 animate-pulse" />
            Waiting for second sample…
          </div>
        )}

        {rate && (
          <>
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Throughput / sec</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <Metric label="Total queries" value={fmt(rate.queries)} highlight />
                <Metric label="Selects" value={fmt(rate.selects)} />
                <Metric label="Inserts" value={fmt(rate.inserts)} />
                <Metric label="Updates" value={fmt(rate.updates)} />
                <Metric label="Deletes" value={fmt(rate.deletes)} />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Connections &amp; Threads</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Metric
                  label="Threads connected"
                  value={String(rate.threadsConnected)}
                  highlight={rate.threadsConnected > 20}
                />
                <Metric
                  label="Threads running"
                  value={String(rate.threadsRunning)}
                  highlight={rate.threadsRunning > 5}
                />
                <Metric
                  label="Slow queries"
                  value={fmt(rate.slowQueries, 2)}
                  sub="/sec"
                  highlight={rate.slowQueries > 0.1}
                />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">I/O</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Metric label="Bytes sent" value={fmtBytes(rate.bytesSent)} />
                <Metric label="Bytes received" value={fmtBytes(rate.bytesReceived)} />
                <Metric
                  label="InnoDB buffer hit rate"
                  value={rate.bufferHitRate === -1 ? '—' : `${rate.bufferHitRate.toFixed(2)}%`}
                  sub={rate.bufferHitRate > 99 ? 'excellent' : rate.bufferHitRate > 95 ? 'good' : 'check indexes'}
                  highlight={rate.bufferHitRate > 0 && rate.bufferHitRate < 95}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
