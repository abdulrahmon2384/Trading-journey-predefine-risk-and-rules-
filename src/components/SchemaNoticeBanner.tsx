import React, { useState, useEffect } from 'react';
import { Database, Copy, Check, ExternalLink, X, Sparkles, Wrench } from 'lucide-react';
import { DATABASE_SCHEMA_SQL, subscribeToSchemaStatus, autoSetupDatabaseSchema } from '../lib/supabase-utils';

export default function SchemaNoticeBanner() {
  const [isMissing, setIsMissing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connectionString, setConnectionString] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    return subscribeToSchemaStatus((missing) => {
      setIsMissing(missing);
    });
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(DATABASE_SCHEMA_SQL.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAutoSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResultMsg(null);
    try {
      const res = await autoSetupDatabaseSchema(connectionString.trim() || undefined);
      if (res.success) {
        setResultMsg({ type: 'success', text: "Tables created successfully! Your database is now initialized." });
        setTimeout(() => {
          setIsOpen(false);
          setIsMissing(false);
        }, 1500);
      } else {
        setResultMsg({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setResultMsg({ type: 'error', text: err.message || "Auto-setup failed." });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMissing) return null;

  return (
    <>
      {/* Top Notification Strip */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-amber-900 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Database size={11} className="stroke-[2.5]" />
            </div>
            <span>
              <strong>Database Notice:</strong> Supabase tables (<code>accounts</code>, <code>trades</code>, <code>withdrawals</code>) are not yet created in your database.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsOpen(true)}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-md text-[11px] transition-colors shadow-2xs flex items-center gap-1"
            >
              <Sparkles size={11} />
              <span>Auto-Create Schema</span>
            </button>
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 font-medium rounded-md text-[11px] transition-colors flex items-center gap-1"
            >
              {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
              <span>{copied ? 'Copied SQL!' : 'Copy SQL'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Schema Setup Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[150] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center">
                  <Database size={18} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Initialize Database Schema</h2>
                  <p className="text-xs text-slate-500">Create the required tables for accounts, trades, and risk</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Status message if any */}
            {resultMsg && (
              <div className={`p-3 rounded-xl text-xs font-medium ${
                resultMsg.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {resultMsg.text}
              </div>
            )}

            {/* Option A: Direct Connection Auto-Create */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">1</div>
                <h3 className="text-xs font-bold text-slate-900">Option A: 1-Click Server Auto-Migration</h3>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Paste your Supabase Postgres connection string (from Supabase Dashboard &rarr; Settings &rarr; Database &rarr; Connection string URI):
              </p>
              <form onSubmit={handleAutoSetup} className="space-y-2">
                <input
                  type="password"
                  placeholder="postgresql://postgres:[password]@db.xyz.supabase.co:5432/postgres"
                  value={connectionString}
                  onChange={(e) => setConnectionString(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Wrench size={13} />
                  <span>{isLoading ? 'Creating tables...' : 'Run Auto-Migration Now'}</span>
                </button>
              </form>
            </div>

            {/* Option B: Copy SQL Script */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">2</div>
                  <h3 className="text-xs font-bold text-slate-900">Option B: Run in Supabase SQL Editor (Instant)</h3>
                </div>
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-semibold rounded-md text-[11px] transition-colors flex items-center gap-1 shadow-2xs"
                >
                  {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                  <span>{copied ? 'Copied SQL!' : 'Copy SQL'}</span>
                </button>
              </div>

              <div className="relative">
                <pre className="bg-slate-950 text-slate-300 p-3 rounded-lg text-[10px] font-mono overflow-x-auto max-h-36 leading-relaxed">
                  {DATABASE_SCHEMA_SQL.trim()}
                </pre>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>1. Copy SQL &rarr; 2. Open Supabase SQL Editor &rarr; 3. Click Run</span>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-slate-800 font-semibold hover:underline"
                >
                  <span>Open Supabase</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
