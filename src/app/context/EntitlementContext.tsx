// Holds "what is this account allowed to do" for the whole app. The answer is fetched from the
// server (public.my_entitlement); on any failure it falls back to Free, so an outage never grants Pro.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { fetchEntitlement, FREE_ENTITLEMENT, type Entitlement } from '../services/entitlements';
import { supabase } from '../services/supabase';

interface Ctx {
  ent: Entitlement;
  /** True while the first answer for a signed-in account is still loading. */
  loading: boolean;
  refresh: () => Promise<Entitlement>;
  openUpgrade: () => void;
}

const EntitlementCtx = createContext<Ctx>({
  ent: FREE_ENTITLEMENT, loading: false, refresh: async () => FREE_ENTITLEMENT, openUpgrade: () => {},
});

export const useEntitlement = () => useContext(EntitlementCtx);

export function EntitlementProvider({
  userId, openUpgrade, children, client = supabase,
}: {
  /** Cloud account id, or null for guests / signed-out (they are always Free). */
  userId: string | null;
  openUpgrade: () => void;
  children: React.ReactNode;
  client?: Parameters<typeof fetchEntitlement>[0];
}) {
  const [ent, setEnt] = useState<Entitlement>(FREE_ENTITLEMENT);
  const [loading, setLoading] = useState<boolean>(Boolean(userId));
  const seq = useRef(0);

  const refresh = useCallback(async () => {
    const mine = ++seq.current;
    if (!userId) { setEnt(FREE_ENTITLEMENT); setLoading(false); return FREE_ENTITLEMENT; }
    const next = await fetchEntitlement(client);
    if (mine === seq.current) { setEnt(next); setLoading(false); } // ignore stale answers
    return next;
  }, [userId, client]);

  useEffect(() => {
    setEnt(FREE_ENTITLEMENT);
    setLoading(Boolean(userId));
    void refresh();
    if (!userId) return;
    const onFocus = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [userId, refresh]);

  const value = useMemo(() => ({ ent, loading, refresh, openUpgrade }), [ent, loading, refresh, openUpgrade]);
  return <EntitlementCtx.Provider value={value}>{children}</EntitlementCtx.Provider>;
}
