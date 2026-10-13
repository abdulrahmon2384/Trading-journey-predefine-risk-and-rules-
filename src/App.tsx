/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import TradeList from './components/TradeList';
import AddAccountDialog from './components/AddAccountDialog';
import AddTradeDialog from './components/AddTradeDialog';
import WithdrawDialog from './components/WithdrawDialog';
import TradeDetailDialog from './components/TradeDetailDialog';
import RiskCalculator from './components/RiskCalculator';
import SchemaNoticeBanner from './components/SchemaNoticeBanner';
import { Account, Trade, Withdrawal } from './types';
import { supabase } from './lib/supabase';
import { 
  subscribeToAccounts, 
  getAccounts, 
  addAccount, 
  subscribeToTrades, 
  subscribeToAllUserTrades, 
  subscribeToAllUserWithdrawals, 
  subscribeToWithdrawals, 
  addTrade, 
  addWithdrawal, 
  deleteTrade, 
  updateTrade, 
  updateAccount 
} from './lib/supabase-utils';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<Withdrawal[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  
  const [activeNav, setActiveNav] = useState<'dashboard' | 'trades' | 'risk' | 'accounts'>('dashboard');

  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  useEffect(() => {
    // Fast resolution so the user never sees a stalled loading screen
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
      })
      .catch((err) => {
        console.warn('Supabase auth session check failed:', err);
        setUser(null);
      })
      .finally(() => {
        clearTimeout(timer);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      setAccountsLoading(true);
      const unsubscribeAccounts = subscribeToAccounts(user.id, (data) => {
        setAccounts(data);
        setAccountsLoading(false);
      });
      
      const unsubscribeTrades = subscribeToAllUserTrades(user.id, (data) => {
        setAllTrades(data);
      });

      const unsubscribeWithdrawals = subscribeToAllUserWithdrawals(user.id, (data) => {
        setAllWithdrawals(data);
      });

      return () => {
        unsubscribeAccounts();
        unsubscribeTrades();
        unsubscribeWithdrawals();
      };
    } else {
      setAccounts([]);
      setAllTrades([]);
      setAllWithdrawals([]);
      setAccountsLoading(false);
    }
  }, [user]);

  // Sync selectedAccount with accounts list whenever accounts update
  useEffect(() => {
    if (selectedAccount) {
      const updated = accounts.find(a => a.id === selectedAccount.id);
      if (updated && (
        updated.currentBalance !== selectedAccount.currentBalance || 
        updated.status !== selectedAccount.status ||
        updated.name !== selectedAccount.name
      )) {
        setSelectedAccount(updated);
      }
    }
  }, [accounts, selectedAccount]);

  useEffect(() => {
    if (user && selectedAccount) {
      const unsubscribeTrades = subscribeToTrades(selectedAccount.id, (data) => {
        setTrades(data);
      }, user.id);
      const unsubscribeWithdrawals = subscribeToWithdrawals(selectedAccount.id, (data) => {
        setWithdrawals(data);
      }, user.id);
      return () => {
        unsubscribeTrades();
        unsubscribeWithdrawals();
      };
    } else {
      setTrades([]);
      setWithdrawals([]);
    }
  }, [user, selectedAccount]);

  const handleLogin = async (email: string, pass: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      if (data?.session) {
        setUser(data.session.user);
      }
    } catch (error: any) {
      console.error("Login error:", error.message);
      if (error.message === 'Failed to fetch') {
        throw new Error("Connection Error: Could not connect to Supabase database. Please check your network and Supabase URL.");
      }
      if (error.message.includes("Email not confirmed")) {
        throw new Error(
          "Email confirmation is enabled in your Supabase project. To allow instant login: In your Supabase Dashboard, go to Authentication -> Providers -> Email -> turn OFF 'Confirm email' and click Save."
        );
      }
      throw error;
    }
  };

  const handleSignUp = async (email: string, pass: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password: pass,
      });
      if (error) throw error;

      if (data?.session?.user) {
        setUser(data.session.user);
        return;
      }

      // If email confirmation is disabled on Supabase, log in directly
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password: pass
      });

      if (!loginError && loginData?.session?.user) {
        setUser(loginData.session.user);
        return;
      }

      if (loginError && loginError.message.includes("Email not confirmed")) {
        throw new Error(
          "Supabase project has 'Confirm email' turned ON: In Supabase Dashboard -> Authentication -> Providers -> Email -> toggle OFF 'Confirm email'. Then users will be created and logged in straight away!"
        );
      }
    } catch (error: any) {
      console.error("Sign up error:", error.message);
      throw error;
    }
  };

  const handleGuestLogin = () => {
    setUser({ id: 'guest_user', email: 'guest@tradex.pro', isGuest: true });
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setUser(null);
    setSelectedAccount(null);
  };

  const handleAddAccount = async (accountData: any) => {
    try {
      const id = await addAccount({
        ...accountData,
        userId: user?.id || 'guest_user'
      });
      if (!id) throw new Error("Failed to create account record.");
      
      if (user) {
        const updatedAccounts = await getAccounts(user.id);
        setAccounts(updatedAccounts);
      }
      
      setIsAddAccountOpen(false);
      return id;
    } catch (error: any) {
      console.error("Add account error:", error);
      throw error;
    }
  };

  const handleAddTrade = async (tradeData: any) => {
    const acc = selectedAccount || accounts[0];
    if (acc) {
      await addTrade({ 
        ...tradeData, 
        accountId: acc.id,
        userId: user?.id || 'guest_user'
      });
    }
  };

  const handleAddWithdrawal = async (amount: number, notes: string) => {
    if (selectedAccount) {
      await addWithdrawal({
        accountId: selectedAccount.id,
        userId: user?.id || 'guest_user',
        amount,
        notes,
        createdAt: new Date().toISOString()
      });
    }
  };

  const handleUpdateTrade = async (tradeId: string, updates: Partial<Trade>) => {
    if (selectedAccount) {
      await updateTrade(tradeId, updates, user?.id);
      
      if (updates.status === 'closed' && updates.profitLoss !== undefined) {
        const newBalance = (selectedAccount.currentBalance || 0) + updates.profitLoss;
        try {
          await updateAccount(selectedAccount.id, { currentBalance: newBalance }, user?.id);
        } catch (error) {
          console.error("Failed to update account balance:", error);
        }
      }
    }
  };

  const handleDeleteTrade = async (tradeId: string) => {
    if (selectedAccount) {
      const trade = trades.find(t => t.id === tradeId);
      if (trade) {
        await deleteTrade(tradeId, selectedAccount.id, trade.profitLoss || 0, user?.id);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs uppercase font-bold tracking-wider text-slate-500">Connecting to Journal...</p>
        </div>
      </div>
    );
  }

  const currentWorkingAccount = selectedAccount || (accounts.length > 0 ? accounts[0] : null);

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout}
      accounts={accounts}
      selectedAccount={selectedAccount}
      onSelectAccount={(acc) => {
        setSelectedAccount(acc);
        if (acc) {
          setActiveNav('trades');
        } else {
          setActiveNav('dashboard');
        }
      }}
      onAddAccount={() => setIsAddAccountOpen(true)}
      onAddTrade={() => setIsAddTradeOpen(true)}
      activeNav={activeNav}
      onNavChange={(nav) => {
        setActiveNav(nav);
        if (nav === 'dashboard') {
          setSelectedAccount(null);
        } else if (nav === 'trades' && !selectedAccount && accounts.length > 0) {
          setSelectedAccount(accounts[0]);
        }
      }}
    >
      {/* Schema notice banner if tables don't exist yet */}
      <SchemaNoticeBanner />

      {!user ? (
        <Auth onLogin={handleLogin} onSignUp={handleSignUp} onGuestLogin={handleGuestLogin} />
      ) : activeNav === 'risk' && currentWorkingAccount ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Risk Matrix &amp; Capital Protection</h2>
              <p className="text-xs text-slate-500">Active Account: {currentWorkingAccount.name}</p>
            </div>
            <button
              onClick={() => setActiveNav('dashboard')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 underline"
            >
              Back to Overview
            </button>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <RiskCalculator 
              initialBalance={currentWorkingAccount.initialBalance}
              currentBalance={currentWorkingAccount.currentBalance} 
              currency={currentWorkingAccount.currency} 
              accountType={currentWorkingAccount.type}
              defaultDrawdownType={currentWorkingAccount.drawdownType}
              defaultDrawdownValue={currentWorkingAccount.drawdownValue || currentWorkingAccount.maxDrawdown}
              openRisk={trades.filter(t => t.status === 'open').reduce((sum, t) => sum + (t.riskAmount || 0), 0)}
            />
          </div>
        </div>
      ) : selectedAccount ? (
        <TradeList 
          account={selectedAccount} 
          trades={trades}
          withdrawals={withdrawals}
          onBack={() => {
            setSelectedAccount(null);
            setActiveNav('dashboard');
          }}
          onAddTrade={() => setIsAddTradeOpen(true)}
          onWithdraw={() => setIsWithdrawOpen(true)}
          onDeleteTrade={handleDeleteTrade}
          onViewTrade={(trade) => setSelectedTrade(trade)}
          onUpdateTrade={handleUpdateTrade}
        />
      ) : (
        <Dashboard 
          accounts={accounts} 
          trades={allTrades}
          withdrawals={allWithdrawals}
          loading={accountsLoading}
          onAddAccount={() => setIsAddAccountOpen(true)}
          onSelectAccount={(account) => {
            setSelectedAccount(account);
            setActiveNav('trades');
          }}
        />
      )}

      {/* Add Account Modal */}
      <AddAccountDialog 
        isOpen={isAddAccountOpen} 
        onClose={() => setIsAddAccountOpen(false)} 
        onAdd={handleAddAccount} 
      />

      {/* Add Trade Modal */}
      {currentWorkingAccount && (
        <AddTradeDialog 
          isOpen={isAddTradeOpen} 
          onClose={() => setIsAddTradeOpen(false)} 
          onAdd={handleAddTrade} 
          account={currentWorkingAccount}
          trades={trades}
        />
      )}

      {/* Withdraw Modal */}
      {selectedAccount && (
        <WithdrawDialog
          isOpen={isWithdrawOpen}
          onClose={() => setIsWithdrawOpen(false)}
          onWithdraw={handleAddWithdrawal}
          account={selectedAccount}
        />
      )}

      {/* Trade Detail Modal */}
      <TradeDetailDialog 
        isOpen={!!selectedTrade} 
        onClose={() => setSelectedTrade(null)} 
        trade={selectedTrade} 
      />
    </Layout>
  );
}
