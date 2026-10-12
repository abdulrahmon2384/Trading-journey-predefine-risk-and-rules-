import React, { useMemo, useState } from 'react';
import { Account, Trade, Withdrawal } from '@/src/types';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  Activity, 
  Target, 
  ShieldAlert, 
  Briefcase, 
  Wallet, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Layers,
  Award,
  Calendar
} from 'lucide-react';

interface DashboardProps {
  accounts: Account[];
  trades: Trade[];
  withdrawals: Withdrawal[];
  loading?: boolean;
  onAddAccount: () => void;
  onSelectAccount: (account: Account) => void;
}

export default function Dashboard({ accounts, trades, withdrawals, loading, onAddAccount, onSelectAccount }: DashboardProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const stats = useMemo(() => {
    if (accounts.length === 0) return null;

    const totalInitial = accounts.reduce((sum, a) => sum + a.initialBalance, 0);
    const totalCurrent = accounts.reduce((sum, a) => sum + a.currentBalance, 0);
    const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const totalProfit = (totalCurrent + totalWithdrawn) - totalInitial;
    const growthPercent = totalInitial > 0 ? (totalProfit / totalInitial) * 100 : 0;

    const openTrades = trades.filter(t => t.status === 'open');
    const closedTrades = trades.filter(t => t.status === 'closed');

    // Current Month & Week Logic
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - dayOfWeek);

    const thisMonthTrades = closedTrades.filter(t => {
      const d = new Date(t.closedAt || t.createdAt);
      return d >= startOfMonth;
    });

    const thisWeekTrades = closedTrades.filter(t => {
      const d = new Date(t.closedAt || t.createdAt);
      return d >= startOfWeek;
    });

    const thisMonthProfit = thisMonthTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
    const thisWeekProfit = thisWeekTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);

    // Filtered Month Logic
    const filterYear = currentMonth.getFullYear();
    const filterMonth = currentMonth.getMonth();
    const filterMonthStart = new Date(filterYear, filterMonth, 1);
    const filterMonthEnd = new Date(filterYear, filterMonth + 1, 0, 23, 59, 59);

    const filteredMonthTrades = closedTrades.filter(t => {
      const d = new Date(t.closedAt || t.createdAt);
      return d >= filterMonthStart && d <= filterMonthEnd;
    });

    // Filtered Week Logic
    let filteredTrades = filteredMonthTrades;
    if (selectedWeek !== null) {
      const weekStart = new Date(filterYear, filterMonth, (selectedWeek * 7) + 1);
      const weekEnd = new Date(filterYear, filterMonth, (selectedWeek * 7) + 7, 23, 59, 59);
      filteredTrades = filteredMonthTrades.filter(t => {
        const d = new Date(t.closedAt || t.createdAt);
        return d >= weekStart && d <= weekEnd;
      });
    }

    const filteredProfit = filteredTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
    const filteredCount = filteredTrades.length;
    const filteredWins = filteredTrades.filter(t => (t.profitLoss || 0) > 0).length;
    const filteredWinRate = filteredCount > 0 ? (filteredWins / filteredCount) * 100 : 0;
    
    // Group open trades by account
    const openTradesByAccount = openTrades.reduce((acc, trade) => {
      acc[trade.accountId] = (acc[trade.accountId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Analysis By stats
    const analysisByStats = closedTrades.reduce((acc, t) => {
      const author = t.analysisBy || 'None';
      if (!acc[author]) acc[author] = { name: author, profit: 0, count: 0, wins: 0 };
      acc[author].profit += (t.profitLoss || 0);
      acc[author].count += 1;
      if ((t.profitLoss || 0) > 0) acc[author].wins += 1;
      return acc;
    }, {} as Record<string, any>);

    // Pair stats
    const pairStats = closedTrades.reduce((acc, t) => {
      const pair = t.pair;
      if (!acc[pair]) acc[pair] = { name: pair, profit: 0, count: 0 };
      acc[pair].profit += (t.profitLoss || 0);
      acc[pair].count += 1;
      return acc;
    }, {} as Record<string, any>);

    // Day of week stats
    const dayStats = closedTrades.reduce((acc, t) => {
      const day = new Date(t.closedAt || t.createdAt).toLocaleDateString('en-US', { weekday: 'long' });
      if (!acc[day]) acc[day] = { name: day, profit: 0, count: 0 };
      acc[day].profit += (t.profitLoss || 0);
      acc[day].count += 1;
      return acc;
    }, {} as Record<string, any>);

    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const sortedDayStats = daysOrder.map(d => dayStats[d] || { name: d.slice(0, 3), profit: 0, count: 0 });

    // Calendar data (Daily P&L)
    const dailyPL = closedTrades.reduce((acc, t) => {
      const date = new Date(t.closedAt || t.createdAt).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + (t.profitLoss || 0);
      return acc;
    }, {} as Record<string, number>);

    // Growth over time data
    const sortedClosedTrades = [...closedTrades].sort((a, b) => 
      new Date(a.closedAt || a.createdAt).getTime() - new Date(b.closedAt || b.createdAt).getTime()
    );

    let runningProfit = 0;
    const chartData = sortedClosedTrades.map(t => {
      runningProfit += (t.profitLoss || 0);
      return {
        date: new Date(t.closedAt || t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        profit: runningProfit,
        rawDate: new Date(t.closedAt || t.createdAt).getTime()
      };
    });

    const totalWins = closedTrades.filter(t => (t.profitLoss || 0) > 0).length;
    const globalWinRate = closedTrades.length > 0 ? (totalWins / closedTrades.length) * 100 : 0;

    return {
      totalInitial,
      totalCurrent,
      totalProfit,
      totalWithdrawn,
      growthPercent,
      openTradesCount: openTrades.length,
      openTradesByAccount,
      chartData,
      globalWinRate,
      analysisByStats: Object.values(analysisByStats).sort((a, b) => b.profit - a.profit),
      pairStats: Object.values(pairStats).sort((a, b) => b.profit - a.profit).slice(0, 5),
      dayStats: sortedDayStats,
      dailyPL,
      thisMonthProfit,
      thisWeekProfit,
      filteredProfit,
      filteredWinRate,
      filteredCount
    };
  }, [accounts, trades, withdrawals, currentMonth, selectedWeek]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-lg w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl" />
          ))}
        </div>
        <div className="h-72 bg-white border border-slate-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overview Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            Portfolio Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time equity curves, prop firm compliance &amp; performance metrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={onAddAccount}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus size={14} className="stroke-[2.5]" />
            <span>New Account</span>
          </button>
        </div>
      </div>

      {stats && accounts.length > 0 && (
        <div className="space-y-8">
          {/* Top Financial KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Equity */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-4.5 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Equity</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp size={15} />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
                  ${stats.totalCurrent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                  <span className={`inline-flex items-center font-medium font-mono text-[11px] ${
                    stats.growthPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {stats.growthPercent >= 0 ? <ArrowUpRight size={13} className="mr-0.5" /> : <ArrowDownRight size={13} className="mr-0.5" />}
                    {stats.growthPercent >= 0 ? '+' : ''}{stats.growthPercent.toFixed(2)}%
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500 text-[11px]">All-time return</span>
                </div>
              </div>
            </div>

            {/* Total Profit & Loss */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-4.5 shadow-xs group hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Net Profit</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  stats.totalProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                }`}>
                  <Activity size={15} />
                </div>
              </div>
              <div className="mt-2">
                <div className={`text-2xl font-bold font-mono tracking-tight tabular-nums ${
                  stats.totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {stats.totalProfit >= 0 ? '+' : ''}${stats.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono text-slate-500">
                  <span>M: <strong className={stats.thisMonthProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {stats.thisMonthProfit >= 0 ? '+' : ''}${Math.round(stats.thisMonthProfit)}
                  </strong></span>
                  <span>·</span>
                  <span>W: <strong className={stats.thisWeekProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {stats.thisWeekProfit >= 0 ? '+' : ''}${Math.round(stats.thisWeekProfit)}
                  </strong></span>
                </div>
              </div>
            </div>

            {/* Win Rate */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-4.5 shadow-xs group hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Win Rate</span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Target size={15} />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
                  {stats.globalWinRate.toFixed(1)}%
                </div>
                <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(stats.globalWinRate, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Active Exposure & Open Trades */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-4.5 shadow-xs group hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Open Positions</span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Briefcase size={15} />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
                  {stats.openTradesCount} <span className="text-xs font-normal text-slate-500 font-sans">active</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Across {accounts.length} monitored account{accounts.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>

          </div>

          {/* Cumulative Growth Chart & Active Accounts Column */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart Canvas */}
            <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Cumulative Equity Curve
                  </h3>
                  <p className="text-xs text-slate-500">
                    Net realized growth trajectory over time
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Realized P&amp;L</span>
                </div>
              </div>

              <div className="h-[260px] w-full">
                {stats.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 11, fill: '#94a3b8' }} 
                        minTickGap={24}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        tickFormatter={(val) => `$${val}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          border: 'none', 
                          borderRadius: '8px', 
                          color: '#fff',
                          fontSize: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}
                        formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Cumulative Return']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="profit" 
                        stroke="#10b981" 
                        strokeWidth={2.5}
                        fillOpacity={1} 
                        fill="url(#profitGradient)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-lg text-center p-6">
                    <TrendingUp size={28} className="text-slate-300 mb-2" />
                    <p className="text-xs text-slate-500 font-medium">No closed trade records yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Log trades to generate your dynamic equity curve</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Account Roster */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Portfolio Accounts</h3>
                <span className="text-xs text-slate-400 font-mono">{accounts.length} total</span>
              </div>

              <div className="space-y-2.5 overflow-y-auto max-h-[250px] pr-1 flex-grow">
                {accounts.map(acc => {
                  const hasOpen = stats.openTradesByAccount[acc.id] || 0;
                  const returnPct = ((acc.currentBalance - acc.initialBalance) / acc.initialBalance) * 100;
                  return (
                    <div
                      key={acc.id}
                      onClick={() => onSelectAccount(acc)}
                      className="p-3 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50/70 transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-slate-900">
                            {acc.name}
                          </p>
                          {hasOpen > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                              {hasOpen} open
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {acc.type.toUpperCase()} · Init: ${acc.initialBalance.toLocaleString()}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-mono font-bold text-slate-900">
                          ${acc.currentBalance.toLocaleString()}
                        </p>
                        <p className={`text-[10px] font-mono font-medium ${
                          returnPct >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Prop Firm & Live Rules Compliance Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Prop Challenges Tracker */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Target size={14} />
                </div>
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Prop Challenges
                </h4>
              </div>

              <div className="space-y-4">
                {accounts.filter(a => a.type === 'prop').length === 0 ? (
                  <p className="text-xs text-slate-400 py-3">No active prop firm evaluation accounts</p>
                ) : (
                  accounts.filter(a => a.type === 'prop').map(a => {
                    const target = a.profitTarget || 10;
                    const currentProfitPct = ((a.currentBalance - a.initialBalance) / a.initialBalance) * 100;
                    const progress = Math.min(Math.max(currentProfitPct, 0) / target * 100, 100);
                    return (
                      <div key={a.id} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-slate-800 truncate pr-2">{a.name}</span>
                          <span className="font-mono text-slate-600 shrink-0">
                            {currentProfitPct.toFixed(1)}% / {target}%
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                            style={{ width: `${progress}%` }} 
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Live Accounts Performance */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Activity size={14} />
                </div>
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Live Accounts P&amp;L
                </h4>
              </div>

              <div className="space-y-3">
                {accounts.filter(a => a.type === 'live').length === 0 ? (
                  <p className="text-xs text-slate-400 py-3">No live accounts configured</p>
                ) : (
                  accounts.filter(a => a.type === 'live').map(a => {
                    const profit = a.currentBalance - a.initialBalance;
                    return (
                      <div key={a.id} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                        <span className="text-xs font-medium text-slate-800 truncate pr-2">{a.name}</span>
                        <span className={`text-xs font-mono font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {profit >= 0 ? '+' : ''}${profit.toLocaleString()}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Prop Live Buffer */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ShieldAlert size={14} />
                </div>
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Funded Buffer Guard
                </h4>
              </div>

              <div className="space-y-3">
                {accounts.filter(a => a.type === 'prop-live').length === 0 ? (
                  <p className="text-xs text-slate-400 py-3">No funded accounts in buffer mode</p>
                ) : (
                  accounts.filter(a => a.type === 'prop-live').map(a => {
                    const initialDD = a.initialBalance * ((a.maxDrawdown || 10) / 100);
                    const profit = a.currentBalance - a.initialBalance;
                    const buffer = initialDD + profit;
                    const threshold = initialDD * 0.6;
                    const isLowBuffer = buffer <= threshold;
                    
                    return (
                      <div key={a.id} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-800 truncate">{a.name}</span>
                          <span className={`font-mono font-bold ${isLowBuffer ? 'text-rose-600' : 'text-emerald-600'}`}>
                            ${buffer.toFixed(0)} Buffer
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>Threshold: ${threshold.toFixed(0)}</span>
                          <span className={isLowBuffer ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                            {isLowBuffer ? 'DEFENSIVE' : 'STANDARD'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Calendar Heatmap & Analytics Drill-Down */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Calendar Heatmap */}
            <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Trading Performance Calendar
                  </h3>
                  <p className="text-xs text-slate-500">
                    Daily net results &amp; trade density
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-800 min-w-[110px] text-center">
                    {currentMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                    <button 
                      onClick={() => {
                        const d = new Date(currentMonth);
                        d.setMonth(d.getMonth() - 1);
                        setCurrentMonth(d);
                      }}
                      className="p-1.5 hover:bg-slate-50 text-slate-600 border-r border-slate-200"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button 
                      onClick={() => {
                        const d = new Date(currentMonth);
                        d.setMonth(d.getMonth() + 1);
                        setCurrentMonth(d);
                      }}
                      className="p-1.5 hover:bg-slate-50 text-slate-600"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-[10px] font-semibold text-slate-400 uppercase py-1">
                    {day}
                  </div>
                ))}

                {(() => {
                  const year = currentMonth.getFullYear();
                  const month = currentMonth.getMonth();
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const days = [];

                  for (let i = 0; i < firstDay; i++) {
                    days.push(<div key={`pad-${i}`} className="aspect-square opacity-0" />);
                  }

                  for (let d = 1; d <= daysInMonth; d++) {
                    const date = new Date(year, month, d);
                    const dateStr = date.toISOString().split('T')[0];
                    const pl = stats.dailyPL[dateStr] || 0;
                    const isToday = new Date().toISOString().split('T')[0] === dateStr;

                    days.push(
                      <div 
                        key={dateStr}
                        className={`aspect-square rounded-lg border p-1 flex flex-col justify-between transition-all group relative ${
                          pl > 0 
                            ? 'bg-emerald-50/70 border-emerald-200/80 hover:bg-emerald-100/70' 
                            : pl < 0 
                            ? 'bg-rose-50/70 border-rose-200/80 hover:bg-rose-100/70' 
                            : 'bg-slate-50/50 border-slate-100 hover:bg-slate-100/50'
                        } ${isToday ? 'ring-2 ring-slate-900 ring-offset-1' : ''}`}
                      >
                        <span className={`text-[10px] font-mono leading-none ${isToday ? 'font-bold text-slate-900' : 'text-slate-400'}`}>
                          {d}
                        </span>

                        {pl !== 0 && (
                          <span className={`text-[9px] font-mono font-bold leading-tight ${
                            pl > 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {pl > 0 ? '+' : ''}${Math.round(pl)}
                          </span>
                        )}

                        {/* Tooltip on hover */}
                        <div className="hidden group-hover:block absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-20 font-mono">
                          {dateStr}: {pl >= 0 ? '+' : ''}${pl.toLocaleString()}
                        </div>
                      </div>
                    );
                  }

                  return days;
                })()}
              </div>
            </div>

            {/* Top Pairs & Day distribution */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Most Traded Assets
                </h3>
                <p className="text-xs text-slate-500">
                  Top performing currency pairs &amp; commodities
                </p>

                <div className="mt-3 space-y-2">
                  {stats.pairStats.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">No closed trades recorded</p>
                  ) : (
                    stats.pairStats.map(pair => (
                      <div key={pair.name} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] font-mono font-bold">
                            {pair.name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {pair.count} trade{pair.count === 1 ? '' : 's'}
                          </span>
                        </div>
                        <span className={`text-xs font-mono font-bold ${
                          pair.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {pair.profit >= 0 ? '+' : ''}${pair.profit.toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-xs font-semibold text-slate-900 mb-2">
                  Weekly Trade Cadence
                </h4>
                <div className="h-28 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.dayStats} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '11px' }}
                      />
                      <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

          </div>

          {/* Accounts Grid (E-commerce / Financial Card presentation) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Trading Accounts Portfolio
                </h3>
                <p className="text-xs text-slate-500">
                  Select an account to enter its dedicated trading workbench &amp; ledger
                </p>
              </div>

              <button
                onClick={onAddAccount}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors"
              >
                <Plus size={13} />
                <span>Add Account</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {accounts.map(account => {
                const profit = account.currentBalance - account.initialBalance;
                const profitPercent = (profit / account.initialBalance) * 100;
                const isProp = account.type === 'prop';

                return (
                  <div
                    key={account.id}
                    onClick={() => onSelectAccount(account)}
                    className="bg-white border border-slate-200/90 hover:border-slate-400 rounded-xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {isProp 
                            ? `${account.propType || '2-Phase'} · Phase ${account.phase}` 
                            : account.type === 'prop-live' 
                            ? 'Funded Live' 
                            : 'Live Broker'}
                        </span>

                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          account.status === 'passed' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : account.status === 'failed' 
                            ? 'bg-rose-100 text-rose-800' 
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          {account.status || 'Active'}
                        </span>
                      </div>

                      {/* Account Title */}
                      <h4 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {account.name}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        Base: {account.currency} · Created {new Date(account.createdAt || Date.now()).toLocaleDateString()}
                      </p>

                      {/* Balance Matrix */}
                      <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                            Initial Capital
                          </span>
                          <p className="text-sm font-mono font-semibold text-slate-700">
                            ${account.initialBalance.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                            Current Equity
                          </span>
                          <p className="text-base font-mono font-bold text-slate-900">
                            ${account.currentBalance.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Progress & Card Action Button */}
                    <div className="mt-5 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-slate-500 font-medium">Return</span>
                        <span className={`font-mono font-bold ${
                          profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {profit >= 0 ? '+' : ''}${profit.toLocaleString()} ({profitPercent.toFixed(2)}%)
                        </span>
                      </div>

                      <button 
                        type="button"
                        className="w-full py-2 bg-slate-50 group-hover:bg-slate-900 group-hover:text-white text-slate-800 font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <span>Open Trading Workbench</span>
                        <ArrowUpRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {accounts.length === 0 && (
        <div className="py-20 bg-white border border-dashed border-slate-300 rounded-2xl text-center max-w-lg mx-auto p-8 space-y-4">
          <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mx-auto">
            <Layers size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">No trading accounts yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Create your first prop firm challenge or personal live account to start logging trades and enforcing risk rules.
            </p>
          </div>
          <button
            onClick={onAddAccount}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            Create Trading Account
          </button>
        </div>
      )}
    </div>
  );
}
