import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  Layers, 
  Calculator, 
  Plus, 
  LogOut, 
  Download, 
  ChevronDown, 
  Wallet,
  ShieldCheck,
  CheckCircle2,
  User
} from 'lucide-react';
import { Account } from '@/src/types';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
  accounts?: Account[];
  selectedAccount?: Account | null;
  onSelectAccount?: (account: Account | null) => void;
  onAddAccount?: () => void;
  onAddTrade?: () => void;
  activeNav?: 'dashboard' | 'trades' | 'risk' | 'accounts';
  onNavChange?: (nav: 'dashboard' | 'trades' | 'risk' | 'accounts') => void;
}

export default function Layout({ 
  children, 
  user, 
  onLogout,
  accounts = [],
  selectedAccount = null,
  onSelectAccount,
  onAddAccount,
  onAddTrade,
  activeNav = 'dashboard',
  onNavChange
}: LayoutProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans">
      {/* Desktop & Mobile Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-4">
          
          {/* Left Zone: Brand + Account Switcher */}
          <div className="flex items-center gap-3 md:gap-5 min-w-0">
            <button 
              onClick={() => onSelectAccount && onSelectAccount(null)}
              className="flex items-center gap-2.5 text-left group shrink-0"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                <TrendingUp size={16} className="text-emerald-400 stroke-[2.5]" />
              </div>
              <div className="hidden sm:block">
                <div className="font-bold text-sm tracking-tight text-slate-900 flex items-center gap-1.5">
                  TRADEX <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">PRO</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono tracking-tight -mt-0.5">
                  JOURNAL &amp; RISK
                </div>
              </div>
            </button>

            {/* Quick Account Switcher dropdown if logged in and accounts exist */}
            {user && accounts.length > 0 && onSelectAccount && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-slate-100/80 text-xs font-medium text-slate-800 transition-colors max-w-[200px] md:max-w-[240px]"
                >
                  <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-500" />
                  <span className="truncate font-mono text-[11px]">
                    {selectedAccount ? selectedAccount.name : 'All Accounts'}
                  </span>
                  <ChevronDown size={13} className="text-slate-400 shrink-0 ml-auto" />
                </button>

                {isAccountMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsAccountMenuOpen(false)} 
                    />
                    <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Switch Account
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          onSelectAccount(null);
                          setIsAccountMenuOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                          !selectedAccount ? 'bg-slate-50 font-semibold text-slate-900' : 'text-slate-600'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Layers size={13} className="text-slate-500" />
                          <span>Global Overview</span>
                        </span>
                        {!selectedAccount && <CheckCircle2 size={13} className="text-emerald-600" />}
                      </button>

                      <div className="my-1 border-t border-slate-100" />

                      <div className="max-h-56 overflow-y-auto">
                        {accounts.map(acc => (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => {
                              onSelectAccount(acc);
                              setIsAccountMenuOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                              selectedAccount?.id === acc.id ? 'bg-slate-50 font-semibold text-slate-900' : 'text-slate-600'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <p className="truncate font-medium">{acc.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                ${acc.currentBalance.toLocaleString()} · {acc.type}
                              </p>
                            </div>
                            {selectedAccount?.id === acc.id && (
                              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>

                      {onAddAccount && (
                        <>
                          <div className="my-1 border-t border-slate-100" />
                          <button
                            type="button"
                            onClick={() => {
                              onAddAccount();
                              setIsAccountMenuOpen(false);
                            }}
                            className="w-full px-3 py-2 text-left text-xs text-slate-900 font-medium hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Plus size={13} className="text-slate-600" />
                            <span>Create New Account</span>
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Center Zone (Desktop Navigation Links) */}
          {user && (
            <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => {
                  if (onNavChange) onNavChange('dashboard');
                  if (onSelectAccount) onSelectAccount(null);
                }}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeNav === 'dashboard' && !selectedAccount
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Portfolio
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onNavChange) onNavChange('trades');
                  if (!selectedAccount && accounts.length > 0 && onSelectAccount) {
                    onSelectAccount(accounts[0]);
                  }
                }}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeNav === 'trades' || selectedAccount
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Trades &amp; Ledger
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onNavChange) onNavChange('risk');
                  if (!selectedAccount && accounts.length > 0 && onSelectAccount) {
                    onSelectAccount(accounts[0]);
                  }
                }}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeNav === 'risk'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Risk Matrix
              </button>
            </nav>
          )}

          {/* Right Zone: Primary Actions & User Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {isInstallable && (
              <button
                onClick={handleInstall}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-medium text-slate-700 transition-colors shadow-2xs"
                title="Install PWA"
              >
                <Download size={13} className="text-slate-500" />
                <span>Install</span>
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                {onAddTrade && selectedAccount && (
                  <button
                    onClick={onAddTrade}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-all shadow-xs active:scale-[0.98]"
                  >
                    <Plus size={14} className="stroke-[2.5]" />
                    <span>Log Trade</span>
                  </button>
                )}

                <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                    <User size={13} />
                  </div>
                  <span className="text-xs font-mono text-slate-600 max-w-[130px] truncate" title={user.email}>
                    {user.email.split('@')[0]}
                  </span>
                </div>

                <button
                  onClick={onLogout}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors text-xs font-medium flex items-center gap-1.5"
                  title="Sign out"
                >
                  <LogOut size={13} />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="text-xs font-medium text-slate-500">
                Secure Terminal
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Viewport Content Canvas */}
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-grow flex flex-col ${!user ? 'justify-center py-10' : 'py-6 md:py-8 pb-24 lg:pb-12'}`}>
        {children}
      </main>

      {/* Mobile App Bottom Tab Bar (Only on mobile viewport, thumb-ergonomic zone) */}
      {user && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 shadow-lg">
          <div className="max-w-md mx-auto grid grid-cols-4 items-center">
            <button
              type="button"
              onClick={() => {
                if (onNavChange) onNavChange('dashboard');
                if (onSelectAccount) onSelectAccount(null);
              }}
              className={`flex flex-col items-center justify-center py-1 text-center min-h-[44px] transition-colors ${
                activeNav === 'dashboard' && !selectedAccount ? 'text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <BarChart3 size={19} className={activeNav === 'dashboard' && !selectedAccount ? 'stroke-[2.5]' : ''} />
              <span className="text-[10px] mt-0.5 tracking-tight">Overview</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onNavChange) onNavChange('trades');
                if (!selectedAccount && accounts.length > 0 && onSelectAccount) {
                  onSelectAccount(accounts[0]);
                }
              }}
              className={`flex flex-col items-center justify-center py-1 text-center min-h-[44px] transition-colors ${
                activeNav === 'trades' || selectedAccount ? 'text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <TrendingUp size={19} className={activeNav === 'trades' || selectedAccount ? 'stroke-[2.5]' : ''} />
              <span className="text-[10px] mt-0.5 tracking-tight">Trades</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onNavChange) onNavChange('risk');
                if (!selectedAccount && accounts.length > 0 && onSelectAccount) {
                  onSelectAccount(accounts[0]);
                }
              }}
              className={`flex flex-col items-center justify-center py-1 text-center min-h-[44px] transition-colors ${
                activeNav === 'risk' ? 'text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Calculator size={19} className={activeNav === 'risk' ? 'stroke-[2.5]' : ''} />
              <span className="text-[10px] mt-0.5 tracking-tight">Risk Calc</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onAddAccount) onAddAccount();
              }}
              className="flex flex-col items-center justify-center py-1 text-center min-h-[44px] text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Layers size={19} />
              <span className="text-[10px] mt-0.5 tracking-tight">+ Account</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Floating Action Button (Log Trade) */}
      {user && selectedAccount && onAddTrade && (
        <button
          onClick={onAddTrade}
          className="lg:hidden fixed bottom-18 right-4 z-40 w-13 h-13 rounded-full bg-slate-950 text-white shadow-xl flex items-center justify-center active:scale-95 transition-transform"
          aria-label="New Trade"
        >
          <Plus size={22} className="stroke-[2.5]" />
        </button>
      )}

      {/* Institutional Desktop Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">TRADEX PRO</span>
            <span>·</span>
            <span>Financial Journal &amp; Prop Risk Engine</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-600">
              <ShieldCheck size={12} />
              <span>Real-Time Risk Guard Active</span>
            </span>
            <span>·</span>
            <span>© {new Date().getFullYear()} All rights reserved</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
