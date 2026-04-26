'use client';
import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Pencil, Trash2, Eraser, Loader2, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useConn } from '@/context/ConnectionContext';
import { useToast } from '@/context/ToastContext';

interface Props {
  db: string;
  table: string;
  onRenamed: (newName: string) => void;
  onDropped: () => void;
  onTruncated: () => void;
}

type Modal = 'rename' | 'truncate-confirm' | 'drop-1' | 'drop-2' | null;

export default function TableActions({ db, table, onRenamed, onDropped, onTruncated }: Props) {
  const { connId } = useConn();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const base = `/api/databases/${encodeURIComponent(db)}/tables/${encodeURIComponent(table)}`;
  const qs = `?conn=${connId}`;

  async function rename() {
    if (!newName.trim() || newName.trim() === table) return;
    setBusy(true);
    const r = await fetch(`${base}/rename${qs}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName: newName.trim() }),
    });
    const d = await r.json();
    setBusy(false);
    if (d.error) { toast(d.error, 'error'); return; }
    toast(`Renamed to "${newName.trim()}"`);
    setModal(null);
    onRenamed(newName.trim());
  }

  async function truncate() {
    setBusy(true);
    const r = await fetch(`${base}/truncate${qs}`, { method: 'POST' });
    const d = await r.json();
    setBusy(false);
    if (d.error) { toast(d.error, 'error'); return; }
    toast(`"${table}" truncated`);
    setModal(null);
    onTruncated();
  }

  async function drop() {
    setBusy(true);
    const r = await fetch(`${base}/drop${qs}`, { method: 'POST' });
    const d = await r.json();
    setBusy(false);
    if (d.error) { toast(d.error, 'error'); return; }
    toast(`Table "${table}" dropped`);
    setModal(null);
    onDropped();
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen(v => !v)}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          title="Table actions"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 w-44 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-30 py-1 overflow-hidden">
            <button
              onClick={() => { setNewName(table); setModal('rename'); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-zinc-500" /> Rename table
            </button>
            <button
              onClick={() => { setModal('truncate-confirm'); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <Eraser className="w-3.5 h-3.5 text-zinc-500" /> Truncate table
            </button>
            <div className="my-1 border-t border-zinc-800" />
            <button
              onClick={() => { setModal('drop-1'); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Drop table
            </button>
          </div>
        )}
      </div>

      {/* Rename modal */}
      {modal === 'rename' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-white">Rename table</h2>
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Current: <span className="font-mono text-zinc-300">{table}</span></label>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && rename()}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">Cancel</button>
              <button
                onClick={rename}
                disabled={busy || !newName.trim() || newName.trim() === table}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium"
              >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Truncate confirm */}
      {modal === 'truncate-confirm' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-300">Truncate table?</p>
                <p className="text-xs text-zinc-400">All rows in <span className="font-mono text-zinc-200">{table}</span> will be permanently deleted. The table structure is kept. This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">Cancel</button>
              <button
                onClick={truncate}
                disabled={busy}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium"
              >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Truncate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drop step 1 */}
      {modal === 'drop-1' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-300">Drop table — are you sure?</p>
                <p className="text-xs text-zinc-400">Dropping <span className="font-mono text-zinc-200">{db}.{table}</span> will permanently destroy the table and all its data.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">Cancel</button>
              <button onClick={() => setModal('drop-2')} className="px-4 py-2 text-sm bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors font-medium">
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drop step 2 */}
      {modal === 'drop-2' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <div className="flex gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-300">Final confirmation</p>
                <p className="text-xs text-zinc-400">You are about to permanently drop <span className="font-mono text-zinc-200">{db}.{table}</span>. There is no undo.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">Cancel</button>
              <button
                onClick={drop}
                disabled={busy}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg transition-colors font-semibold"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Drop table
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
