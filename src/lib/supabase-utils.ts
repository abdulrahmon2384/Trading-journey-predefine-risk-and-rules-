import { supabase } from './supabase';

// Account Operations
export const getAccounts = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false });
    
    if (error) {
      console.error('Error fetching accounts:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Unexpected error fetching accounts:', err);
    return [];
  }
};

export const subscribeToAccounts = (userId: string, callback: (accounts: any[]) => void) => {
  const fetchAccounts = async () => {
    const accounts = await getAccounts(userId);
    callback(accounts);
  };

  fetchAccounts();

  const subscription = supabase
    .channel(`accounts_${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts', filter: `userId=eq.${userId}` }, () => {
      fetchAccounts();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

export const addAccount = async (accountData: any) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("No authenticated user found. Please log in first.");
  }

  // Remove any undefined fields
  const cleanData = Object.fromEntries(
    Object.entries(accountData).filter(([_, v]) => v !== undefined)
  );

  const { data, error } = await supabase
    .from('accounts')
    .insert([{ ...cleanData, userId: user.id }])
    .select()
    .single();

  if (error) {
    console.error('Supabase error adding account:', error);
    throw error;
  }
  
  return data.id;
};

export const deleteAccount = async (accountId: string) => {
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', accountId);

  if (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
};

export const updateAccount = async (accountId: string, updates: any) => {
  const cleanData = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined)
  );

  const { error } = await supabase
    .from('accounts')
    .update(cleanData)
    .eq('id', accountId);

  if (error) {
    console.error('Error updating account in Supabase:', error);
    throw error;
  }
};

// Trade Operations
export const subscribeToTrades = (accountId: string, callback: (trades: any[]) => void) => {
  const fetchTrades = async () => {
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('accountId', accountId)
        .order('createdAt', { ascending: false });
      
      if (error) {
        console.error('Error fetching trades:', error);
        callback([]);
        return;
      }
      callback(data || []);
    } catch (err) {
      console.error('Unexpected error fetching trades:', err);
      callback([]);
    }
  };

  fetchTrades();

  const subscription = supabase
    .channel(`trades_${accountId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trades', filter: `accountId=eq.${accountId}` }, () => {
      fetchTrades();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

export const subscribeToAllUserTrades = (userId: string, callback: (trades: any[]) => void) => {
  const fetchTrades = async () => {
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false });
      
      if (error) {
        console.error('Error fetching all trades:', error);
        callback([]);
        return;
      }
      callback(data || []);
    } catch (err) {
      console.error('Unexpected error fetching all trades:', err);
      callback([]);
    }
  };

  fetchTrades();

  const subscription = supabase
    .channel(`all_trades_${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trades', filter: `userId=eq.${userId}` }, () => {
      fetchTrades();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

export const subscribeToAllUserWithdrawals = (userId: string, callback: (withdrawals: any[]) => void) => {
  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false });
      
      if (error) {
        console.error('Error fetching all withdrawals:', error);
        callback([]);
        return;
      }
      callback(data || []);
    } catch (err) {
      console.error('Unexpected error fetching all withdrawals:', err);
      callback([]);
    }
  };

  fetchWithdrawals();

  const subscription = supabase
    .channel(`all_withdrawals_${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals', filter: `userId=eq.${userId}` }, () => {
      fetchWithdrawals();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

export const addTrade = async (tradeData: any) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("No authenticated user found.");
  }

  const cleanData = Object.fromEntries(
    Object.entries(tradeData).filter(([_, v]) => v !== undefined)
  );

  // 1. Insert the trade
  const { data: trade, error: tradeError } = await supabase
    .from('trades')
    .insert([{ ...cleanData, userId: user.id }])
    .select()
    .single();

  if (tradeError) {
    console.error('Supabase error adding trade:', tradeError);
    throw tradeError;
  }

  // 2. Update account balance if profitLoss is provided
  if (tradeData.profitLoss && tradeData.accountId) {
    const { data: account } = await supabase
      .from('accounts')
      .select('currentBalance')
      .eq('id', tradeData.accountId)
      .single();

    if (account) {
      await supabase
        .from('accounts')
        .update({ currentBalance: (account.currentBalance || 0) + tradeData.profitLoss })
        .eq('id', tradeData.accountId);
    }
  }

  return trade.id;
};

export const addWithdrawal = async (withdrawalData: any) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No authenticated user found.");

  // 1. Insert the withdrawal
  const { data: withdrawal, error: withdrawalError } = await supabase
    .from('withdrawals')
    .insert([{ ...withdrawalData, userId: user.id }])
    .select()
    .single();

  if (withdrawalError) {
    console.error('Error adding withdrawal to Supabase:', withdrawalError);
    throw withdrawalError;
  }

  // 2. Update account balance
  if (withdrawalData.accountId && withdrawalData.amount) {
    const { data: account } = await supabase
      .from('accounts')
      .select('currentBalance')
      .eq('id', withdrawalData.accountId)
      .single();

    if (account) {
      const newBalance = (account.currentBalance || 0) - withdrawalData.amount;
      await supabase
        .from('accounts')
        .update({ currentBalance: newBalance })
        .eq('id', withdrawalData.accountId);
    }
  }

  return withdrawal.id;
};

export const subscribeToWithdrawals = (accountId: string, callback: (withdrawals: any[]) => void) => {
  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('accountId', accountId)
        .order('createdAt', { ascending: false });
      
      if (error) {
        console.error('Error fetching withdrawals:', error);
        return;
      }
      callback(data || []);
    } catch (err) {
      console.error('Unexpected error fetching withdrawals:', err);
    }
  };

  fetchWithdrawals();

  const subscription = supabase
    .channel(`withdrawals_${accountId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals', filter: `accountId=eq.${accountId}` }, () => {
      fetchWithdrawals();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

export const updateTrade = async (tradeId: string, updates: any) => {
  const cleanData = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined)
  );

  const { error } = await supabase
    .from('trades')
    .update(cleanData)
    .eq('id', tradeId);

  if (error) {
    console.error('Error updating trade in Supabase:', error);
    throw error;
  }
};

export const deleteTrade = async (tradeId: string, accountId: string, profitLoss: number) => {
  // 1. Delete the trade
  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('id', tradeId);

  if (error) {
    console.error('Error deleting trade from Supabase:', error);
    throw error;
  }

  // 2. Revert account balance
  if (profitLoss && accountId) {
    const { data: account } = await supabase
      .from('accounts')
      .select('currentBalance')
      .eq('id', accountId)
      .single();

    if (account) {
      await supabase
        .from('accounts')
        .update({ currentBalance: (account.currentBalance || 0) - profitLoss })
        .eq('id', accountId);
    }
  }
};
