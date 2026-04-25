'use client';
import { useState, useEffect } from 'react';
import { Trash2, Plus, X } from 'lucide-react';

interface DbUser {
  User: string; Host: string; plugin: string; password_expired: string; account_locked: string;
}

export default function UserManager() {
  const [users, setUsers] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ user: '', host: '%', password: '', grants: 'ALL PRIVILEGES' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  async function load() {
    setLoading(true);
    const r = await fetch('/api/users');
    const d = await r.json();
    if (d.error) setError(d.error);
    else setUsers(d.users || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function deleteUser(user: string, host: string) {
    if (!confirm(`Drop user '${user}'@'${host}'?`)) return;
    await fetch('/api/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, host }),
    });
    load();
  }

  async function createUser() {
    setSaving(true);
    setSaveError('');
    const r = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: form.user,
        host: form.host,
        password: form.password,
        grants: form.grants ? [form.grants] : [],
      }),
    });
    const d = await r.json();
    if (d.error) { setSaveError(d.error); setSaving(false); return; }
    setSaving(false);
    setCreating(false);
    setForm({ user: '', host: '%', password: '', grants: 'ALL PRIVILEGES' });
    load();
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Users</h2>
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-3 py-1.5 rounded hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Create User
        </button>
      </div>

      {error && <div className="mb-4 p-3 text-red-600 bg-red-50 rounded text-sm">{error}</div>}

      {loading ? <div className="text-gray-400 text-sm">Loading…</div> : (
        <table className="w-full text-sm border border-gray-200 rounded">
          <thead className="bg-gray-50">
            <tr>
              {['User', 'Host', 'Plugin', 'Pwd Expired', 'Locked', ''].map(h => (
                <th key={h} className="px-3 py-2 text-left font-medium text-gray-600 border-b text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={i} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-gray-800">{u.User || '(anonymous)'}</td>
                <td className="px-3 py-2 text-gray-600">{u.Host}</td>
                <td className="px-3 py-2 text-gray-500 text-xs">{u.plugin}</td>
                <td className="px-3 py-2 text-gray-500">{u.password_expired}</td>
                <td className="px-3 py-2 text-gray-500">{u.account_locked}</td>
                <td className="px-3 py-2">
                  <button onClick={() => deleteUser(u.User, u.Host)}
                    className="text-gray-400 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {creating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-gray-800">Create User</h3>
              <button onClick={() => setCreating(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {[
                { label: 'Username', key: 'user', type: 'text' },
                { label: 'Host (% = any)', key: 'host', type: 'text' },
                { label: 'Password', key: 'password', type: 'password' },
                { label: 'Grant (e.g. ALL PRIVILEGES)', key: 'grants', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    value={form[f.key as keyof typeof form]}
                    onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
            </div>
            {saveError && <div className="px-4 pb-2 text-red-600 text-sm">{saveError}</div>}
            <div className="flex justify-end gap-2 px-4 py-3 border-t">
              <button onClick={() => setCreating(false)} className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={createUser} disabled={saving}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
