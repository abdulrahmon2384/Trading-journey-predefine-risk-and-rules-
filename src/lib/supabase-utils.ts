import { supabase } from './supabase';
import * as mock from './mock-storage';

const isConfigMissing = false;

// Account Operations
export const getAccounts = async (userId: string) => {
  if (isConfigMissing) return [];
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
  if (isConfigMissing) return mock.mockSubscribeToAccounts(callback);

  const fetchAccounts = async () => {
    const accounts = await getAccounts(userId);
    callback(accounts);
  };

  fetchAccounts();

  // Real-time subscription with unique channel name
  const subscription = supabase
    .channel(`accounts_${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts', filter: `userId=eq.${userId}` }, (payload) => {
      console.log('Account change detected:', payload);
      fetchAccounts();
    })
    .subscribe((status) => {
      console.log(`Accounts subscription status for ${userId}:`, status);
    });

  return () => {
    supabase.removeChannel(subscription);
  };
};

export const addAccount = async (accountData: any) => {
  if (isConfigMissing) return mock.mockAddAccount(accountData);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('No authenticated user found when adding account');
    return null;
  }

  console.log('Inserting account for user:', user.id, accountData);

  // Remove any undefined fields that might cause Supabase to choke
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
    // If it's a 404, the table might be missing
    if (error.code === '42P01') {
      throw new Error("Database table 'accounts' not found. Please run the SQL script in your Supabase dashboard.");
    }
    // If it's a 42703, a column is missing
    if (error.code === '42703') {
      throw new Error(`Database column missing: ${error.message}. Please re-run the SQL script.`);
    }
    throw error;
  }
  
  console.log('Account created successfully:', data.id);
  return data.id;
};

export const deleteAccount = async (accountId: string) => {
  if (isConfigMissing) return; // Mock delete not implemented for accounts yet

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
  if (isConfigMissing) return;

  // Remove any undefined fields
  const cleanData = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined)
  );

  const { error } = await supabase
    .from('accounts')
    .update(cleanData)
    .eq('id', accountId);

  if (error) {
    console.error('Error updating account:', error);
    if (error.code === '42703') {
      throw new Error(`Database column missing in accounts table: ${error.message}`);
    }
    throw error;
  }
};

// Trade Operations
export const subscribeToTrades = (accountId: string, callback: (trades: any[]) => void) => {
  if (isConfigMissing) return mock.mockSubscribeToTrades(accountId, callback);

  const fetchTrades = async () => {
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('accountId', accountId)
        .order('createdAt', { ascending: false });
      
      if (error) {
        console.error('Error fetching trades:', error);
        return;
      }
      callback(data || []);
    } catch (err) {
      console.error('Unexpected error fetching trades:', err);
    }
  };

  fetchTrades();

  const subscription = supabase
    .channel(`trades_${accountId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trades', filter: `accountId=eq.${accountId}` }, (payload) => {
      console.log('Trade change detected:', payload);
      fetchTrades();
    })
    .subscribe((status) => {
      console.log(`Trades subscription status for ${accountId}:`, status);
    });

  return () => {
    supabase.removeChannel(subscription);
  };
};

export const subscribeToAllUserTrades = (userId: string, callback: (trades: any[]) => void) => {
  if (isConfigMissing) return () => {};

  const fetchTrades = async () => {
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false });
      
      if (error) {
        console.error('Error fetching all trades:', error);
        return;
      }
      callback(data || []);
    } catch (err) {
      console.error('Unexpected error fetching all trades:', err);
    }
  };

  fetchTrades();

  const subscription = supabase
    .channel(`all_trades_${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trades', filter: `userId=eq.${userId}` }, (payload) => {
      fetchTrades();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

export const subscribeToAllUserWithdrawals = (userId: string, callback: (withdrawals: any[]) => void) => {
  if (isConfigMissing) return () => {};

  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false });
      
      if (error) {
        console.error('Error fetching all withdrawals:', error);
        return;
      }
      callback(data || []);
    } catch (err) {
      console.error('Unexpected error fetching all withdrawals:', err);
    }
  };

  fetchWithdrawals();

  const subscription = supabase
    .channel(`all_withdrawals_${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals', filter: `userId=eq.${userId}` }, (payload) => {
      fetchWithdrawals();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

export const addTrade = async (tradeData: any) => {
  if (isConfigMissing) return mock.mockAddTrade(tradeData);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('No authenticated user found when adding trade');
    return null;
  }

  console.log('Inserting trade for user:', user.id, tradeData);

  // Remove any undefined fields
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
    if (tradeError.code === '23502') {
      throw new Error(`Missing required field: ${tradeError.details || tradeError.message}`);
    }
    if (tradeError.code === '42P01') {
      throw new Error("Database table 'trades' not found. Please run the SQL script.");
    }
    throw tradeError;
  }

  // 2. Update account balance if profitLoss is provided
  if (tradeData.profitLoss) {
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

  console.log('Trade created successfully:', trade.id);
  return trade.id;
};

export const addWithdrawal = async (withdrawalData: any) => {
  if (isConfigMissing) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Insert the withdrawal
  const { data: withdrawal, error: withdrawalError } = await supabase
    .from('withdrawals')
    .insert([{ ...withdrawalData, userId: user.id }])
    .select()
    .single();

  if (withdrawalError) {
    console.error('Error adding withdrawal:', withdrawalError);
    if (withdrawalError.code === '42P01') {
      throw new Error("Database table 'withdrawals' not found. Please run the SQL script.");
    }
    throw withdrawalError;
  }

  // 2. Update account balance
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

  return withdrawal.id;
};

export const subscribeToWithdrawals = (accountId: string, callback: (withdrawals: any[]) => void) => {
  if (isConfigMissing) return () => {};

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
    .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals', filter: `accountId=eq.${accountId}` }, (payload) => {
      fetchWithdrawals();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
};

export const updateTrade = async (tradeId: string, updates: any) => {
  if (isConfigMissing) return;

  // Remove any undefined fields
  const cleanData = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v !== undefined)
  );

  console.log('Updating trade in Supabase:', tradeId, cleanData);

  const { error } = await supabase
    .from('trades')
    .update(cleanData)
    .eq('id', tradeId);

  if (error) {
    console.error('Error updating trade:', error);
    if (error.code === '42703') {
      throw new Error(`Database column missing in trades table: ${error.message}. Please run the SQL script to update your schema.`);
    }
    throw error;
  }
};

export const deleteTrade = async (tradeId: string, accountId: string, profitLoss: number) => {
  if (isConfigMissing) return mock.mockDeleteTrade(tradeId, accountId, profitLoss);

  // 1. Delete the trade
  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('id', tradeId);

  if (error) {
    console.error('Error deleting trade:', error);
    throw error;
  }

  // 2. Revert account balance
  if (profitLoss) {
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
