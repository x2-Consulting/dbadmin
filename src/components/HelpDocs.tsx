'use client';
import { Keyboard, Database, Code2, Shield, HardDrive, Users, BookOpen, Search, Table2 } from 'lucide-react';

interface Section {
  icon: React.ReactNode;
  title: string;
  items: { label: string; desc: string }[];
}

const sections: Section[] = [
  {
    icon: <Keyboard className="w-4 h-4" />,
    title: 'Keyboard shortcuts',
    items: [
      { label: 'Ctrl+Enter / Cmd+Enter', desc: 'Run query in SQL editor' },
      { label: 'Ctrl+K / Cmd+K',        desc: 'Open table search palette' },
      { label: 'Esc',                    desc: 'Close search palette / cancel dialog' },
      { label: '↑ / ↓',                 desc: 'Navigate search results' },
      { label: 'Enter',                  desc: 'Open selected search result' },
    ],
  },
  {
    icon: <Code2 className="w-4 h-4" />,
    title: 'SQL editor',
    items: [
      { label: 'Partial execution',   desc: 'Select text in the editor and press Run — only the selection is executed' },
      { label: 'Explain',             desc: 'Shows the query execution plan without running the query' },
      { label: 'Dry run',             desc: 'Wraps the query in a transaction and rolls it back — lets you preview effects safely' },
      { label: 'Destructive warning', desc: 'DROP, TRUNCATE, DELETE, ALTER, and UPDATE queries show a confirmation banner before running' },
      { label: 'Export CSV',          desc: 'Downloads the current SELECT result as a CSV file' },
      { label: 'Save query',          desc: 'Click the bookmark icon to name and save the current SQL for later use' },
      { label: 'History',             desc: 'Every executed query is logged — click History to browse, replay, or reuse past queries' },
    ],
  },
  {
    icon: <Table2 className="w-4 h-4" />,
    title: 'Table browser',
    items: [
      { label: 'Filter',        desc: 'Click Filter in the toolbar to show per-column search inputs. Press Enter or Apply to filter rows.' },
      { label: 'Edit row',      desc: 'Hover over a row and click the pencil icon to edit it in a modal form' },
      { label: 'Delete row',    desc: 'Hover over a row and click the trash icon — confirm in the browser dialog' },
      { label: 'Insert row',    desc: 'Click Insert Row in the toolbar to add a new row' },
      { label: 'Export CSV',    desc: 'Downloads all rows (not just the current page) matching any active filters' },
      { label: 'Pagination',    desc: 'Browse 50 rows per page using the arrows at the bottom' },
    ],
  },
  {
    icon: <Search className="w-4 h-4" />,
    title: 'Search',
    items: [
      { label: 'Table search',   desc: 'Press Ctrl+K or Cmd+K to search all table names and column names in the current connection' },
      { label: 'Column matches', desc: 'Results include tables that contain a matching column — navigate straight to the table' },
      { label: 'Min length',     desc: 'Search requires at least 2 characters. Results are capped at 20 per category.' },
    ],
  },
  {
    icon: <Database className="w-4 h-4" />,
    title: 'Connections',
    items: [
      { label: 'Multiple connections',  desc: 'Click the connection selector at the top of the sidebar to switch between saved connections or add a new one' },
      { label: 'SSL modes',             desc: 'disable — no SSL; require — SSL without certificate verification; verify — full certificate chain check' },
      { label: 'Read-only connections', desc: 'Tick Read-only to prevent any INSERT, UPDATE, DELETE, DROP or DDL from running on that connection' },
      { label: 'Test connection',       desc: 'Use the Test button in the connection form before saving to verify credentials' },
    ],
  },
  {
    icon: <HardDrive className="w-4 h-4" />,
    title: 'Backup & restore',
    items: [
      { label: 'Backup',     desc: 'Downloads a SQL dump (DDL + data) for any database. Large databases should use mysqldump or pg_dump instead.' },
      { label: 'Restore',    desc: 'Uploads and executes a .sql file against a target database. On PostgreSQL the whole file is atomic; on MySQL each statement commits individually.' },
      { label: 'Limitations', desc: 'Stored procedures, triggers, and events are not included. Binary columns are hex-encoded. Max upload size is 100 MB.' },
    ],
  },
  {
    icon: <Users className="w-4 h-4" />,
    title: 'User management',
    items: [
      { label: 'List users',   desc: 'Shows all database users and their authentication plugin, expiry, and lock status' },
      { label: 'Create user',  desc: 'Provide a username, host (MySQL), password, and an optional comma-separated list of privileges' },
      { label: 'Drop user',    desc: 'Removes the user account. On MySQL this also flushes privileges.' },
    ],
  },
  {
    icon: <Shield className="w-4 h-4" />,
    title: 'Security',
    items: [
      { label: 'Session',          desc: 'Sessions are signed with HMAC-SHA256 and expire after 8 hours. Tokens are stored in an HttpOnly, SameSite=Strict cookie.' },
      { label: 'Rate limiting',    desc: 'Login is rate-limited to 5 attempts per 15 minutes per IP' },
      { label: 'HTTPS',            desc: 'Run npm run generate-cert to create a self-signed certificate, then restart the server — it will auto-detect the cert and switch to HTTPS' },
      { label: 'SQL injection',    desc: 'All row data operations use parameterised queries. Identifiers (table/column names) are validated and quoted.' },
    ],
  },
];

export default function HelpDocs() {
  return (
    <div className="flex flex-col h-full bg-[#09090b] overflow-auto">
      <div className="px-6 py-4 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-zinc-100">Help &amp; Reference</h2>
        </div>
        <p className="text-xs text-zinc-500 mt-1">Quick reference for all features in DB Admin</p>
      </div>

      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-5xl">
          {sections.map(section => (
            <div key={section.title} className="border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 bg-zinc-900/60 border-b border-zinc-800">
                <span className="text-blue-400">{section.icon}</span>
                <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">{section.title}</h3>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {section.items.map(item => (
                  <div key={item.label} className="px-4 py-2.5 flex gap-3">
                    <span className="text-xs font-mono text-zinc-300 whitespace-nowrap shrink-0 w-44">{item.label}</span>
                    <span className="text-xs text-zinc-500 leading-relaxed">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
