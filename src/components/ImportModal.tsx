'use client';
import { useState, useRef, useCallback } from 'react';
import { X, Upload, FileCode, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useConn } from '@/context/ConnectionContext';
import { useToast } from '@/context/ToastContext';

interface Props {
  db: string;
  table?: string;
  onClose: () => void;
  onImported: () => void;
}

type Mode = 'sql' | 'csv';

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  function splitLine(line: string): string[] {
    const cols: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && !inQuote) { inQuote = true; continue; }
      if (ch === '"' && inQuote && line[i + 1] === '"') { cur += '"'; i++; continue; }
      if (ch === '"' && inQuote) { inQuote = false; continue; }
      if (ch === ',' && !inQuote) { cols.push(cur); cur = ''; continue; }
      cur += ch;
    }
    cols.push(cur);
    return cols;
  }
  const headers = splitLine(lines[0]);
  const rows = lines.slice(1).map(splitLine);
  return { headers, rows };
}

export default function ImportModal({ db, table, onClose, onImported }: Props) {
  const { connId } = useConn();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>(table ? 'csv' : 'sql');
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [targetTable, setTargetTable] = useState(table || '');
  const [sqlContent, setSqlContent] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    setFile(f);
    setResult(null);
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      setMode('csv');
      const reader = new FileReader();
      reader.onload = e => {
        const text = e.target?.result as string;
        setCsvData(parseCSV(text));
      };
      reader.readAsText(f);
    } else {
      setMode('sql');
      const reader = new FileReader();
      reader.onload = e => setSqlContent(e.target?.result as string);
      reader.readAsText(f);
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  async function run() {
    setImporting(true);
    setResult(null);
    try {
      const body = mode === 'sql'
        ? { type: 'sql', sql: sqlContent }
        : { type: 'csv', table: targetTable, headers: csvData!.headers, rows: csvData!.rows };
      const r = await fetch(`/api/databases/${encodeURIComponent(db)}/import?conn=${connId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.error) {
        setResult({ ok: false, message: d.error });
      } else {
        const msg = mode === 'csv' ? `${d.imported} rows imported` : 'SQL executed successfully';
        setResult({ ok: true, message: msg });
        toast(msg);
        onImported();
      }
    } finally { setImporting(false); }
  }

  const canRun = mode === 'sql' ? !!sqlContent.trim() : !!(csvData && targetTable.trim());

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-white">Import</h2>
            <p className="text-xs text-zinc-500 mt-0.5 font-mono">{db}{targetTable ? `.${targetTable}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            {(['sql', 'csv'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setFile(null); setCsvData(null); setSqlContent(''); setResult(null); }}
                className={`flex items-center gap-2 flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                  mode === m ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                }`}
              >
                {m === 'sql' ? <FileCode className="w-3.5 h-3.5" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                {m === 'sql' ? 'SQL file' : 'CSV file'}
              </button>
            ))}
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
              dragging ? 'border-blue-500 bg-blue-500/5' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/30'
            }`}
          >
            <Upload className={`w-8 h-8 ${dragging ? 'text-blue-400' : 'text-zinc-600'}`} />
            {file ? (
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-200">{file.name}</p>
                <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB — click to change</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-zinc-400">Drop a {mode.toUpperCase()} file here</p>
                <p className="text-xs text-zinc-600 mt-1">or click to browse</p>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={mode === 'sql' ? '.sql,.txt' : '.csv'}
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>

          {/* CSV: target table + preview */}
          {mode === 'csv' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Target table</label>
                <input
                  value={targetTable}
                  onChange={e => setTargetTable(e.target.value)}
                  placeholder="table_name"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              {csvData && (
                <div>
                  <p className="text-xs text-zinc-500 mb-2">
                    {csvData.rows.length} rows · {csvData.headers.length} columns — preview:
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-zinc-800">
                    <table className="min-w-full text-xs">
                      <thead className="bg-zinc-800/60">
                        <tr>
                          {csvData.headers.map(h => (
                            <th key={h} className="px-3 py-2 text-left font-medium text-zinc-400 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.rows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t border-zinc-800/60">
                            {row.map((cell, j) => (
                              <td key={j} className="px-3 py-1.5 text-zinc-400 max-w-[120px] truncate">{cell || <span className="text-zinc-700 italic">empty</span>}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {csvData.rows.length > 5 && (
                    <p className="text-[10px] text-zinc-600 mt-1">…and {csvData.rows.length - 5} more rows</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SQL: preview */}
          {mode === 'sql' && sqlContent && (
            <div>
              <p className="text-xs text-zinc-500 mb-1.5">Preview:</p>
              <pre className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-3 text-xs text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-32">
                {sqlContent.slice(0, 600)}{sqlContent.length > 600 ? '\n…' : ''}
              </pre>
            </div>
          )}

          {result && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-xs ${
              result.ok ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              {result.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
              {result.message}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-zinc-800 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={run}
            disabled={importing || !canRun}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium"
          >
            {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {importing ? 'Importing…' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
