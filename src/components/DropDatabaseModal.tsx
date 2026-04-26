'use client';
import { useState } from 'react';
import { AlertTriangle, ShieldAlert, HardDrive, X, Trash2 } from 'lucide-react';
import { useConn } from '@/context/ConnectionContext';
import { useToast } from '@/context/ToastContext';

interface Props {
  db: string;
  onClose: () => void;
  onDropped: (db: string) => void;
  onGoBackup: () => void;
}

export default function DropDatabaseModal({ db, onClose, onDropped, onGoBackup }: Props) {
  const { connId } = useConn();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [dropping, setDropping] = useState(false);

  async function drop() {
    setDropping(true);
    try {
      const r = await fetch(`/api/databases/${encodeURIComponent(db)}?conn=${connId}`, {
        method: 'DELETE',
      });
      const d = await r.json();
      if (d.error) {
        toast(d.error, 'error');
        return;
      }
      toast(`Database "${db}" dropped`);
      onDropped(db);
    } finally {
      setDropping(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${step === 1 ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
              {step === 1
                ? <AlertTriangle className="w-4 h-4 text-amber-400" />
                : <ShieldAlert className="w-4 h-4 text-red-400" />}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                {step === 1 ? 'Drop Database' : 'Final Confirmation'}
              </h2>
              <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">{db}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step 1 — Backup warning */}
        {step === 1 && (
          <div className="p-5 space-y-4">
            <div className="flex gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-amber-300">This is a destructive action</p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Dropping <span className="font-mono text-zinc-200">{db}</span> will permanently delete all tables,
                  data, and views inside it. This <span className="font-medium text-white">cannot be undone</span>.
                </p>
                <p className="text-xs text-amber-400/80 font-medium mt-2">
                  Do you have a current backup of this database?
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => { onGoBackup(); onClose(); }}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm text-zinc-200 rounded-xl transition-colors font-medium"
              >
                <HardDrive className="w-4 h-4 text-zinc-400" />
                Take me to Backup first
              </button>
              <button
                onClick={() => setStep(2)}
                className="w-full py-2.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors rounded-xl"
              >
                I already have a backup — continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Final confirmation */}
        {step === 2 && (
          <div className="p-5 space-y-4">
            <div className="flex gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-red-300">Are you absolutely sure?</p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  You are about to permanently drop the database{' '}
                  <span className="font-mono font-medium text-white bg-zinc-800 px-1.5 py-0.5 rounded">{db}</span>.
                  Every table and row inside will be destroyed immediately.
                  There is no undo.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 text-sm text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={drop}
                disabled={dropping}
                className="flex items-center justify-center gap-2 flex-1 py-2.5 text-sm bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl transition-colors font-semibold"
              >
                <Trash2 className="w-4 h-4" />
                {dropping ? 'Dropping…' : `Drop "${db}"`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
