'use client';
import { Keyboard, Database, Code2, Shield, HardDrive, Users, BookOpen, Search, Table2, Eye, Network, Gauge, GitCompare, SearchCode, Copy } from 'lucide-react';

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
      { label: 'Ctrl+K / Cmd+K',         desc: 'Open table search palette' },
      { label: 'Esc',                     desc: 'Close search palette / cancel dialog' },
      { label: '↑ / ↓',                  desc: 'Navigate search results' },
      { label: 'Enter',                   desc: 'Open selected search result' },
    ],
  },
  {
    icon: <Code2 className="w-4 h-4" />,
    title: 'SQL editor',
    items: [
      { label: 'Multi-tab',           desc: 'Click + in the tab bar to open multiple independent SQL editor tabs; each retains its own query and result' },
      { label: 'Partial execution',   desc: 'Select text in the editor and press Run — only the selection is executed' },
      { label: 'Explain',             desc: 'Shows the query execution plan without running the query' },
      { label: 'Dry run',             desc: 'Wraps the query in a transaction and rolls it back — lets you preview effects safely' },
      { label: 'Format',              desc: 'Auto-formats SQL: uppercases keywords and adds newlines before major clauses (FROM, WHERE, JOIN, etc.)' },
      { label: 'Destructive warning', desc: 'DROP, TRUNCATE, DELETE, ALTER, and UPDATE queries show a confirmation banner before running' },
      { label: 'Result sorting',      desc: 'Click any column header in the results table to sort ascending or descending' },
      { label: 'Result pagination',   desc: 'Results over 200 rows are paginated — use the arrows at the top right of the results to navigate' },
      { label: 'Cell expand',         desc: 'Click any cell with long text (>80 chars) to open a full-value modal; JSON is auto-formatted' },
      { label: 'Export CSV / JSON',   desc: 'Downloads the current SELECT result in your chosen format' },
      { label: 'Chart',               desc: 'Toggle a bar chart view of query results — pick X and Y axes from detected columns' },
      { label: 'Save query',          desc: 'Click the bookmark icon to name and save the current SQL for later use' },
      { label: 'History',             desc: 'Every executed query is logged — click History to browse, replay, or reuse past queries' },
    ],
  },
  {
    icon: <Table2 className="w-4 h-4" />,
    title: 'Table browser',
    items: [
      { label: 'Filter',        desc: 'Click Filter in the toolbar to show per-column search inputs. Press Enter or Apply to filter rows.' },
      { label: 'Sort',          desc: 'Click a column header to sort ascending; click again to sort descending' },
      { label: 'Edit row',      desc: 'Hover over a row and click the pencil icon to edit it in a modal form' },
      { label: 'Delete row',    desc: 'Hover over a row and click the trash icon — confirm in the browser dialog' },
      { label: 'Insert row',    desc: 'Click Insert Row in the toolbar to add a new row' },
      { label: 'Bulk delete',   desc: 'Tick row checkboxes and use the Delete Selected button to remove multiple rows at once' },
      { label: 'Export CSV',    desc: 'Downloads all rows (not just the current page) matching any active filters' },
      { label: 'Export JSON',   desc: 'Same as CSV export but in JSON array format' },
      { label: 'Export SQL',    desc: 'Downloads rows as INSERT INTO statements — useful for moving data between databases' },
      { label: 'Copy table',    desc: 'Table Actions → Copy table — duplicate the table structure and optionally its data into a new name' },
      { label: 'Pagination',    desc: 'Browse 50 rows per page using the arrows at the bottom' },
    ],
  },
  {
    icon: <Eye className="w-4 h-4" />,
    title: 'Views',
    items: [
      { label: 'Browse views',   desc: 'Views are listed below tables in the sidebar (italic, purple). Click to browse their data like a table.' },
      { label: 'Manage views',   desc: 'Expand a database → Views to open the view manager — create, edit, and drop views' },
      { label: 'Create view',    desc: 'Click New View, enter a name and SELECT query. Uses CREATE OR REPLACE VIEW internally.' },
      { label: 'Edit view',      desc: 'Expand a view row to see its definition in a SQL editor. Save Changes rewrites it.' },
      { label: 'Drop view',      desc: 'Hover a view in the list and click the trash icon' },
    ],
  },
  {
    icon: <SearchCode className="w-4 h-4" />,
    title: 'Data search',
    items: [
      { label: 'Full-text search', desc: 'Expand a database → Search Data to search a term across all text columns in every table' },
      { label: 'Results',          desc: 'Matches are grouped by table, showing the column, matched value, and primary key of the row' },
      { label: 'Navigate',         desc: 'Click Open table on any result group to jump directly to that table in the browser' },
      { label: 'Scope',            desc: 'Only searches columns of text types (VARCHAR, TEXT, CHAR, ENUM). Numeric and binary columns are skipped.' },
    ],
  },
  {
    icon: <Network className="w-4 h-4" />,
    title: 'ER diagram',
    items: [
      { label: 'Open',             desc: 'Expand a database in the sidebar → ER Diagram' },
      { label: 'Layout',           desc: 'Tables are positioned using a force-directed algorithm — related tables cluster together automatically' },
      { label: 'Drag',             desc: 'Click and drag any table box to reposition it; drag the background to pan' },
      { label: 'Zoom',             desc: 'Use the + / − buttons or the reset button in the toolbar' },
      { label: 'Relationships',    desc: 'Arrows are drawn for every declared foreign key constraint. Hover a table to highlight its connected tables.' },
      { label: 'Limitation',       desc: 'Only FK constraints defined in the database schema are drawn. Implicit relationships are not shown.' },
    ],
  },
  {
    icon: <Search className="w-4 h-4" />,
    title: 'Search palette',
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
      { label: 'SSH tunnel',            desc: 'Fill in SSH Host, User, and Password or Private Key to connect through a bastion/jump host. The tunnel is opened automatically when the connection is first used.' },
      { label: 'Test connection',       desc: 'Use the Test button in the connection form before saving to verify credentials' },
    ],
  },
  {
    icon: <GitCompare className="w-4 h-4" />,
    title: 'Schema diff',
    items: [
      { label: 'Compare databases', desc: 'Sidebar → Schema Diff — select two databases (can be on different connections) and click Compare' },
      { label: 'Results',           desc: 'Shows tables only in A, only in B, and tables in both with column additions, removals, or type changes' },
      { label: 'Use cases',         desc: 'Verify a migration, compare staging vs production, or audit schema drift between environments' },
    ],
  },
  {
    icon: <Gauge className="w-4 h-4" />,
    title: 'Top queries',
    items: [
      { label: 'MySQL / MariaDB',   desc: 'Reads from performance_schema.events_statements_summary_by_digest — shows the 50 slowest queries by average execution time' },
      { label: 'PostgreSQL',        desc: 'Reads from pg_stat_statements (requires the extension to be installed and enabled)' },
      { label: 'Sorting',           desc: 'Click Avg (ms), Max (ms), Calls, or Total (ms) to re-sort the list' },
      { label: 'Expand',            desc: 'Click any row to see the full query text and all timing stats' },
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
