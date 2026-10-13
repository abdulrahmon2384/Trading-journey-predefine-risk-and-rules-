import { supabase } from './supabase';

export const DATABASE_SCHEMA_SQL = `
-- Trading Journal Database Schema for Supabase
CREATE TABLE IF NOT EXISTS public.accounts (
  id text PRIMARY KEY,
  "userId" text NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  "propType" text,
  phase integer,
  "maxDrawdown" numeric,
  "dailyDrawdown" numeric,
  "profitTarget" numeric,
  "drawdownType" text,
  "drawdownValue" numeric,
  "liveTargetAmount" numeric,
  "initialBalance" numeric NOT NULL,
  "currentBalance" numeric NOT NULL,
  currency text DEFAULT 'USD',
  status text DEFAULT 'active',
  "createdAt" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trades (
  id text PRIMARY KEY,
  "accountId" text NOT NULL,
  "userId" text,
  pair text NOT NULL,
  type text NOT NULL,
  "entryPrice" numeric NOT NULL,
  "stopLoss" numeric NOT NULL,
  "takeProfit" numeric,
  "lotSize" numeric DEFAULT 0,
  "riskAmount" numeric DEFAULT 0,
  "exitPrice" numeric,
  "profitLoss" numeric,
  "additionalLoss" numeric,
  status text DEFAULT 'open',
  "imageUrl" text,
  "afterImageUrl" text,
  notes text,
  "analysisBy" text,
  "createdAt" timestamp with time zone DEFAULT now(),
  "closedAt" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.withdrawals (
  id text PRIMARY KEY,
  "accountId" text NOT NULL,
  "userId" text,
  amount numeric NOT NULL,
  notes text,
  "createdAt" timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Permissive policies for application usage
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accounts' AND policyname = 'Accounts public access') THEN
    CREATE POLICY "Accounts public access" ON public.accounts FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trades' AND policyname = 'Trades public access') THEN
    CREATE POLICY "Trades public access" ON public.trades FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'withdrawals' AND policyname = 'Withdrawals public access') THEN
    CREATE POLICY "Withdrawals public access" ON public.withdrawals FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`;

// Schema missing listeners
let isSchemaMissingState = false;
const schemaListeners = new Set<(missing: boolean) => void>();

export const notifySchemaMissing = (missing: boolean) => {
  if (isSchemaMissingState !== missing) {
    isSchemaMissingState = missing;
    schemaListeners.forEach(listener => listener(missing));
  }
};

export const subscribeToSchemaStatus = (callback: (missing: boolean) => void) => {
  schemaListeners.add(callback);
  callback(isSchemaMissingState);
  return () => {
    schemaListeners.delete(callback);
  };
};

const isTableMissingError = (err: any) => {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = err.code || '';
  return code === '42P01' || 
         msg.includes('does not exist') || 
         msg.includes('not available') || 
         msg.includes('relation') ||
         msg.includes('schema cache') ||
         msg.includes('could not find the table');
};

// Local storage fallback helpers for zero-downtime resilience
const getLocalAccounts = (userId: string): any[] => {
  try {
    const raw = localStorage.getItem(`sb_local_accounts_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalAccounts = (userId: string, accounts: any[]) => {
  try {
    localStorage.setItem(`sb_local_accounts_${userId}`, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save accounts locally:', e);
  }
};

const getLocalTrades = (userId: string): any[] => {
  try {
    const raw = localStorage.getItem(`sb_local_trades_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalTrades = (userId: string, trades: any[]) => {
  try {
    localStorage.setItem(`sb_local_trades_${userId}`, JSON.stringify(trades));
  } catch (e) {
    console.error('Failed to save trades locally:', e);
  }
};

const getLocalWithdrawals = (userId: string): any[] => {
  try {
    const raw = localStorage.getItem(`sb_local_withdrawals_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalWithdrawals = (userId: string, withdrawals: any[]) => {
  try {
    localStorage.setItem(`sb_local_withdrawals_${userId}`, JSON.stringify(withdrawals));
  } catch (e) {
    console.error('Failed to save withdrawals locally:', e);
  }
};

// Account Operations
export const getAccounts = async (userId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false });

    if (error) {
      if (isTableMissingError(error)) {
        console.warn("Notice: 'accounts' table not found in Supabase. Using resilient local cache.");
        notifySchemaMissing(true);
        return getLocalAccounts(userId);
      }
      console.error('Error fetching accounts:', error);
      return getLocalAccounts(userId);
    }

    notifySchemaMissing(false);
    return data || [];
  } catch (err: any) {
    if (isTableMissingError(err)) {
      notifySchemaMissing(true);
    }
    return getLocalAccounts(userId);
  }
};

export const subscribeToAccounts = (userId: string, callback: (accounts: any[]) => void) => {
  let isMounted = true;

  const fetchAccounts = async () => {
    const accounts = await getAccounts(userId);
    if (isMounted) callback(accounts);
  };

  fetchAccounts();

  let subscription: any = null;
  try {
    subscription = supabase
      .channel(`accounts_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts', filter: `userId=eq.${userId}` }, () => {
        fetchAccounts();
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          // If channel fails due to missing table or permission, keep local data active
          fetchAccounts();
        }
      });
  } catch (e) {
    console.warn("Realtime subscription fallback:", e);
  }

  // Also listen for local custom events when in resilient mode
  const localListener = () => fetchAccounts();
  window.addEventListener('sb_local_accounts_updated', localListener);

  return () => {
    isMounted = false;
    window.removeEventListener('sb_local_accounts_updated', localListener);
    if (subscription) {
      try {
        supabase.removeChannel(subscription);
      } catch {
        // ignore
      }
    }
  };
};

export const addAccount = async (accountData: any): Promise<string> => {
  let userId = '';
  try {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || accountData.userId || 'guest_user';
  } catch {
    userId = accountData.userId || 'guest_user';
  }

  const generatedId = `acc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const cleanData = Object.fromEntries(
    Object.entries(accountData).filter(([_, v]) => v !== undefined)
  );

  const newAccountRecord = {
    ...cleanData,
    id: generatedId,
    userId,
    createdAt: cleanData.createdAt || new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('accounts')
      .insert([newAccountRecord])
      .select()
      .single();

    if (error) {
      if (isTableMissingError(error)) {
        notifySchemaMissing(true);
        console.warn("Supabase table 'accounts' not yet created. Saved to resilient client database.");
        const current = getLocalAccounts(userId);
        saveLocalAccounts(userId, [newAccountRecord, ...current]);
        window.dispatchEvent(new CustomEvent('sb_local_accounts_updated'));
        return generatedId;
      }
      throw error;
    }

    notifySchemaMissing(false);
    return data.id;
  } catch (err: any) {
    if (isTableMissingError(err)) {
      notifySchemaMissing(true);
      const current = getLocalAccounts(userId);
      saveLocalAccounts(userId, [newAccountRecord, ...current]);
      window.dispatchEvent(new CustomEvent('sb_local_accounts_updated'));
      return generatedId;
    }
    // Fallback save locally to never drop user input
    const current = getLocalAccounts(userId);
    saveLocalAccounts(userId, [newAccountRecord, ...current]);
    window.dispatchEvent(new CustomEvent('sb_local_accounts_updated'));
    return generatedId;
  }
};

export const deleteAccount = async (accountId: string, userId?: string) => {
  try {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', accountId);

    if (error && !isTableMissingError(error)) {
      console.error('Error deleting account:', error);
    }
  } catch {
    // ignore
  }

  // Also remove from local store
  if (userId) {
    const current = getLocalAccounts(userId);
    saveLocalAccounts(userId, current.filter(a => a.id !== accountId));
    window.dispatchEvent(new CustomEvent('sb_local_accounts_updated'));
  }
};

export const updateAccount = async (accountId: string, updates: any, userId?: string) => {
  const cleanData = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined)
  );

  try {
    const { error } = await supabase
      .from('accounts')
      .update(cleanData)
      .eq('id', accountId);

    if (error && isTableMissingError(error)) {
      notifySchemaMissing(true);
    }
  } catch (err) {
    // ignore
  }

  // Update in local store
  if (userId) {
    const current = getLocalAccounts(userId);
    const updated = current.map(a => a.id === accountId ? { ...a, ...cleanData } : a);
    saveLocalAccounts(userId, updated);
    window.dispatchEvent(new CustomEvent('sb_local_accounts_updated'));
  }
};

// Trade Operations
export const getTrades = async (accountId: string, userId?: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('accountId', accountId)
      .order('createdAt', { ascending: false });

    if (error) {
      if (isTableMissingError(error)) {
        notifySchemaMissing(true);
        const all = userId ? getLocalTrades(userId) : [];
        return all.filter(t => t.accountId === accountId);
      }
      return [];
    }

    notifySchemaMissing(false);
    return data || [];
  } catch (err) {
    const all = userId ? getLocalTrades(userId) : [];
    return all.filter(t => t.accountId === accountId);
  }
};

export const subscribeToTrades = (accountId: string, callback: (trades: any[]) => void, userId?: string) => {
  let isMounted = true;

  const fetchTrades = async () => {
    const data = await getTrades(accountId, userId);
    if (isMounted) callback(data);
  };

  fetchTrades();

  let subscription: any = null;
  try {
    subscription = supabase
      .channel(`trades_${accountId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades', filter: `accountId=eq.${accountId}` }, () => {
        fetchTrades();
      })
      .subscribe();
  } catch {
    // ignore
  }

  const localListener = () => fetchTrades();
  window.addEventListener('sb_local_trades_updated', localListener);

  return () => {
    isMounted = false;
    window.removeEventListener('sb_local_trades_updated', localListener);
    if (subscription) {
      try {
        supabase.removeChannel(subscription);
      } catch {
        // ignore
      }
    }
  };
};

export const subscribeToAllUserTrades = (userId: string, callback: (trades: any[]) => void) => {
  let isMounted = true;

  const fetchTrades = async () => {
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) {
        if (isTableMissingError(error)) {
          notifySchemaMissing(true);
          if (isMounted) callback(getLocalTrades(userId));
          return;
        }
        if (isMounted) callback(getLocalTrades(userId));
        return;
      }

      notifySchemaMissing(false);
      if (isMounted) callback(data || []);
    } catch {
      if (isMounted) callback(getLocalTrades(userId));
    }
  };

  fetchTrades();

  let subscription: any = null;
  try {
    subscription = supabase
      .channel(`all_trades_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, () => {
        fetchTrades();
      })
      .subscribe();
  } catch {
    // ignore
  }

  const localListener = () => fetchTrades();
  window.addEventListener('sb_local_trades_updated', localListener);

  return () => {
    isMounted = false;
    window.removeEventListener('sb_local_trades_updated', localListener);
    if (subscription) {
      try {
        supabase.removeChannel(subscription);
      } catch {
        // ignore
      }
    }
  };
};

export const addTrade = async (tradeData: any) => {
  let userId = tradeData.userId || '';
  if (!userId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || 'guest_user';
    } catch {
      userId = 'guest_user';
    }
  }

  const generatedId = `trd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const cleanData = Object.fromEntries(
    Object.entries(tradeData).filter(([_, v]) => v !== undefined)
  );

  const tradeRecord = {
    ...cleanData,
    id: generatedId,
    userId,
    createdAt: cleanData.createdAt || new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('trades')
      .insert([tradeRecord])
      .select()
      .single();

    if (error) {
      if (isTableMissingError(error)) {
        notifySchemaMissing(true);
        console.warn("Table 'trades' not yet created in Supabase. Saved to resilient client database.");
        const current = getLocalTrades(userId);
        saveLocalTrades(userId, [tradeRecord, ...current]);
        window.dispatchEvent(new CustomEvent('sb_local_trades_updated'));
        return generatedId;
      }
      throw error;
    }

    notifySchemaMissing(false);
    return data.id;
  } catch (err: any) {
    notifySchemaMissing(true);
    const current = getLocalTrades(userId);
    saveLocalTrades(userId, [tradeRecord, ...current]);
    window.dispatchEvent(new CustomEvent('sb_local_trades_updated'));
    return generatedId;
  }
};

export const updateTrade = async (tradeId: string, updates: any, userId?: string) => {
  const cleanData = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined)
  );

  try {
    const { error } = await supabase
      .from('trades')
      .update(cleanData)
      .eq('id', tradeId);

    if (error && isTableMissingError(error)) {
      notifySchemaMissing(true);
    }
  } catch {
    // ignore
  }

  if (userId) {
    const current = getLocalTrades(userId);
    const updated = current.map(t => t.id === tradeId ? { ...t, ...cleanData } : t);
    saveLocalTrades(userId, updated);
    window.dispatchEvent(new CustomEvent('sb_local_trades_updated'));
  }
};

export const deleteTrade = async (tradeId: string, accountId: string, pnl: number, userId?: string) => {
  try {
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', tradeId);

    if (error && !isTableMissingError(error)) {
      console.error('Error deleting trade:', error);
    }
  } catch {
    // ignore
  }

  if (userId) {
    const current = getLocalTrades(userId);
    saveLocalTrades(userId, current.filter(t => t.id !== tradeId));
    window.dispatchEvent(new CustomEvent('sb_local_trades_updated'));
  }
};

// Withdrawal Operations
export const subscribeToWithdrawals = (accountId: string, callback: (withdrawals: any[]) => void, userId?: string) => {
  let isMounted = true;

  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('accountId', accountId)
        .order('createdAt', { ascending: false });

      if (error) {
        if (isTableMissingError(error)) {
          notifySchemaMissing(true);
          const all = userId ? getLocalWithdrawals(userId) : [];
          if (isMounted) callback(all.filter(w => w.accountId === accountId));
          return;
        }
        if (isMounted) callback([]);
        return;
      }

      notifySchemaMissing(false);
      if (isMounted) callback(data || []);
    } catch {
      const all = userId ? getLocalWithdrawals(userId) : [];
      if (isMounted) callback(all.filter(w => w.accountId === accountId));
    }
  };

  fetchWithdrawals();

  let subscription: any = null;
  try {
    subscription = supabase
      .channel(`withdrawals_${accountId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals', filter: `accountId=eq.${accountId}` }, () => {
        fetchWithdrawals();
      })
      .subscribe();
  } catch {
    // ignore
  }

  const localListener = () => fetchWithdrawals();
  window.addEventListener('sb_local_withdrawals_updated', localListener);

  return () => {
    isMounted = false;
    window.removeEventListener('sb_local_withdrawals_updated', localListener);
    if (subscription) {
      try {
        supabase.removeChannel(subscription);
      } catch {
        // ignore
      }
    }
  };
};

export const subscribeToAllUserWithdrawals = (userId: string, callback: (withdrawals: any[]) => void) => {
  let isMounted = true;

  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) {
        if (isTableMissingError(error)) {
          notifySchemaMissing(true);
          if (isMounted) callback(getLocalWithdrawals(userId));
          return;
        }
        if (isMounted) callback(getLocalWithdrawals(userId));
        return;
      }

      notifySchemaMissing(false);
      if (isMounted) callback(data || []);
    } catch {
      if (isMounted) callback(getLocalWithdrawals(userId));
    }
  };

  fetchWithdrawals();

  let subscription: any = null;
  try {
    subscription = supabase
      .channel(`all_withdrawals_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, () => {
        fetchWithdrawals();
      })
      .subscribe();
  } catch {
    // ignore
  }

  const localListener = () => fetchWithdrawals();
  window.addEventListener('sb_local_withdrawals_updated', localListener);

  return () => {
    isMounted = false;
    window.removeEventListener('sb_local_withdrawals_updated', localListener);
    if (subscription) {
      try {
        supabase.removeChannel(subscription);
      } catch {
        // ignore
      }
    }
  };
};

export const addWithdrawal = async (data: any) => {
  let userId = data.userId || '';
  if (!userId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || 'guest_user';
    } catch {
      userId = 'guest_user';
    }
  }

  const generatedId = `wd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );

  const record = {
    ...cleanData,
    id: generatedId,
    userId,
    createdAt: cleanData.createdAt || new Date().toISOString()
  };

  try {
    const { data: result, error } = await supabase
      .from('withdrawals')
      .insert([record])
      .select()
      .single();

    if (error) {
      if (isTableMissingError(error)) {
        notifySchemaMissing(true);
        const current = getLocalWithdrawals(userId);
        saveLocalWithdrawals(userId, [record, ...current]);
        window.dispatchEvent(new CustomEvent('sb_local_withdrawals_updated'));
        return generatedId;
      }
      throw error;
    }

    notifySchemaMissing(false);
    return result.id;
  } catch {
    notifySchemaMissing(true);
    const current = getLocalWithdrawals(userId);
    saveLocalWithdrawals(userId, [record, ...current]);
    window.dispatchEvent(new CustomEvent('sb_local_withdrawals_updated'));
    return generatedId;
  }
};

// Auto Schema migration trigger
export const autoSetupDatabaseSchema = async (connectionString?: string): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await fetch('/api/init-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionString })
    });
    const data = await res.json();
    if (data.success) {
      notifySchemaMissing(false);
      return { success: true, message: data.message || "Database tables created successfully!" };
    } else {
      return { success: false, message: data.message || data.error || "Auto-setup failed." };
    }
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to contact auto-setup server." };
  }
};
