import React, { useState } from 'react';
import { TrendingUp, ArrowRight, ShieldCheck, Database, KeyRound, HelpCircle, Eye } from 'lucide-react';
import { isSupabaseConfigured, saveCustomCredentials } from '../lib/supabase';

interface AuthProps {
  onLogin: (email: string, pass: string) => void;
  onSignUp: (email: string, pass: string) => void;
  onGuestLogin?: () => void;
}

export default function Auth({ onLogin, onSignUp, onGuestLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual DB credentials entry if deployed without env vars
  const [customUrl, setCustomUrl] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [showDbFields, setShowDbFields] = useState(!isSupabaseConfigured);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (isLogin) {
        await onLogin(email, password);
      } else {
        await onSignUp(email, password);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during authentication.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim() || !customKey.trim()) {
      setError("Please provide both Supabase Project URL and Anon Public Key.");
      return;
    }
    saveCustomCredentials(customUrl, customKey);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[75vh] px-4 font-sans">
      <div className="w-full max-w-[440px] bg-white border border-slate-200/90 rounded-2xl shadow-xl p-8 space-y-6">
        
        {/* Brand Lockup */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center text-white mx-auto shadow-md">
            <TrendingUp size={24} className="text-emerald-400 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              TRADEX <span className="text-xs font-semibold uppercase text-slate-400">PRO</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Trading Journal &amp; Prop Firm Risk Management
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              isLogin ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              !isLogin ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Email Confirmation Notice (when creating account) */}
        {!isLogin && (
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
            <HelpCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Direct account creation:</span> To let users register and log in instantly without email confirmation:
              <div className="mt-1 font-mono text-[10px] text-amber-800">
                Supabase Dashboard &rarr; Authentication &rarr; Providers &rarr; Email &rarr; Turn OFF &quot;Confirm email&quot; &rarr; Save.
              </div>
            </div>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium leading-relaxed">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-slate-700">Email Address</label>
            <input
              id="email"
              type="email"
              required
              placeholder="trader@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="password" className="font-semibold text-slate-700">Password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-slate-400 hover:text-slate-700 font-medium"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all font-mono"
              disabled={isLoading}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-[0.99]"
            >
              <span>{isLoading ? 'Processing...' : (isLogin ? 'Sign In to Journal' : 'Create Account')}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>

        {/* Guest Preview Access Button */}
        {onGuestLogin && (
          <div className="pt-1 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={onGuestLogin}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Eye size={13} className="text-slate-600" />
              <span>Explore Dashboard (Preview Mode)</span>
            </button>
            <p className="text-[10px] text-slate-400 mt-1">Instant access to preview charts, risk tools, and ledger</p>
          </div>
        )}

        {/* Database Configuration Toggle if needed */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowDbFields(!showDbFields)}
            className="w-full text-center text-[11px] text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 font-medium"
          >
            <Database size={12} className={isSupabaseConfigured ? "text-emerald-500" : "text-amber-500"} />
            <span>{isSupabaseConfigured ? "Supabase Connected" : "Configure Supabase Credentials"}</span>
          </button>

          {showDbFields && (
            <form onSubmit={handleSaveCredentials} className="mt-3 space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-700">Project URL</label>
                <input
                  type="text"
                  placeholder="https://xyz.supabase.co"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-700">Anon Public Key</label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUz..."
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full py-1.5 bg-slate-900 text-white font-semibold text-xs rounded shadow-xs"
              >
                Save &amp; Connect
              </button>
            </form>
          )}
        </div>

        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
          <ShieldCheck size={12} className="text-emerald-600" />
          <span>Encrypted Database Storage via Supabase</span>
        </div>
      </div>
    </div>
  );
}
