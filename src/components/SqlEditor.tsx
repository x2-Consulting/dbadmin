'use client';
import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Play, Clock } from 'lucide-react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface Props { db?: string; }

interface QueryResult {
  rows?: Record<string, unknown>[];
  affectedRows?: number;
  insertId?: number;
  elapsed: number;
  type: 'select' | 'write';
  error?: string;
}

export default function SqlEditor({ db }: Props) {
  const [sql, setSql] = useState(db ? `USE \`${db}\`;\n\nSELECT * FROM ` : 'SELECT 1;');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [running, setRunning] = useState(false);
  const editorRef = useRef<unknown>(null);

  async function runQuery() {
    const selected = (editorRef.current as { getSelection: () => unknown; getModel: () => { getValueInRange: (s: unknown) => string } } | null)
      ?.getModel()?.getValueInRange(
        (editorRef.current as { getSelection: () => unknown })?.getSelection()
      );
    const toRun = (selected?.trim() || sql).trim();
    if (!toRun) return;

    setRunning(true);
    try {
      const r = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: toRun, db }),
      });
      const d = await r.json();
      setResult(d);
    } finally { setRunning(false); }
  }

  const columns = result?.rows?.length ? Object.keys(result.rows[0]) : [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
        {db && <span className="text-xs text-gray-500 font-mono bg-gray-200 px-2 py-0.5 rounded">{db}</span>}
        <button
          onClick={runQuery}
          disabled={running}
          className="flex items-center gap-1.5 bg-green-600 text-white text-sm px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5" />
          {running ? 'Running…' : 'Run (Ctrl+Enter)'}
        </button>
        <span className="text-xs text-gray-400">Select text to run a partial query</span>
      </div>

      <div className="h-48 border-b border-gray-200 shrink-0">
        <MonacoEditor
          language="sql"
          value={sql}
          onChange={v => setSql(v || '')}
          onMount={(editor) => {
            editorRef.current = editor;
            editor.addCommand(2048 | 3, runQuery); // Ctrl+Enter
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
          }}
          theme="vs"
        />
      </div>

      <div className="flex-1 overflow-auto">
        {result?.error && (
          <div className="p-4 text-red-600 text-sm bg-red-50">{result.error}</div>
        )}

        {result && !result.error && result.type === 'write' && (
          <div className="p-4 text-sm text-green-700 bg-green-50 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {result.affectedRows} row(s) affected
            {result.insertId ? `, insert ID: ${result.insertId}` : ''}
            {` · ${result.elapsed}ms`}
          </div>
        )}

        {result?.rows && columns.length > 0 && (
          <div>
            <div className="px-3 py-1.5 text-xs text-gray-500 bg-gray-50 border-b flex gap-3">
              <span>{result.rows.length} rows</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{result.elapsed}ms</span>
            </div>
            <table className="min-w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-gray-100">
                <tr>
                  {columns.map(c => (
                    <th key={c} className="px-3 py-2 text-left border-b border-gray-200 font-medium text-gray-700 whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-blue-50 border-b border-gray-100">
                    {columns.map(c => (
                      <td key={c} className="px-3 py-1 text-gray-800 max-w-xs truncate">
                        {row[c] === null
                          ? <span className="text-gray-400 italic">NULL</span>
                          : String(row[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result?.rows && columns.length === 0 && (
          <div className="p-4 text-sm text-gray-500">Query returned no columns.</div>
        )}
      </div>
    </div>
  );
}
