'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const LS_KEY = 'activeConnectionId';

interface ConnCtx {
  connId: string;
  setConnId: (id: string) => void;
}

const ConnectionContext = createContext<ConnCtx>({ connId: '', setConnId: () => {} });

export function ConnectionProvider({ children }: { children: React.ReactNode }) {
  const [connId, setConnIdState] = useState(() =>
    typeof window !== 'undefined' ? (localStorage.getItem(LS_KEY) ?? '') : ''
  );

  useEffect(() => {
    if (connId) return; // already restored from localStorage
    fetch('/api/connections/default')
      .then(r => r.json())
      .then(d => { if (d.defaultId) setConnIdState(d.defaultId); })
      .catch(() => {});
  }, [connId]);

  function setConnId(id: string) {
    setConnIdState(id);
    localStorage.setItem(LS_KEY, id);
  }

  return (
    <ConnectionContext.Provider value={{ connId, setConnId }}>
      {children}
    </ConnectionContext.Provider>
  );
}

export const useConn = () => useContext(ConnectionContext);
