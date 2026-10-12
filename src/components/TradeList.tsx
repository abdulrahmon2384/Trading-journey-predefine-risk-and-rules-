import React, { useState } from 'react';
import { Account, Trade, Withdrawal } from '@/src/types';
import RiskCalculator from './RiskCalculator';
import ConfirmTradeDialog from './ConfirmTradeDialog';
import { 
  Wallet, 
  Plus, 
  ArrowLeft, 
  TrendingUp, 
  ShieldAlert, 
  Target, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  BarChart2
} from 'lucide-react';

interface TradeListProps {
  account: Account;
  trades: Trade[];
  withdrawals: Withdrawal[];
  onBack: () => void;
  onAddTrade: () => void;
  onWithdraw: () => void;
  onDeleteTrade: (tradeId: string) => void;
  onViewTrade: (trade: Trade) => void;
  onUpdateTrade: (tradeId: string, updates: Partial<Trade>) => void;
}

export default function TradeList({ 
  account, 
  trades, 
  withdrawals, 
  onBack, 
  onAddTrade, 
  onWithdraw, 
  onDeleteTrade, 
  onViewTrade, 
  onUpdateTrade 
}: TradeListProps) {
  const [activeTab, setActiveTab] = useState<'log' | 'risk' | 'insights' | 'withdrawals'>('log');
  const [confirmTrade, setConfirmTrade] = useState<Trade | null>(null);

  const isProp = account.type === 'prop';
  const canWithdraw = account.type === 'live' || account.type === 'prop-live';
  
  // Calculate prop metrics
  const profit = account.currentBalance - account.initialBalance;
  const profitPercentage = account.initialBalance > 0 ? (profit / account.initialBalance) * 100 : 0;
  
  // Daily P/L calculation
  const today = new Date().toLocaleDateString();
  const todayTrades = trades.filter(t => new Date(t.createdAt).toLocaleDateString() === today);
  const dailyPL = todayTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
  const startOfDayBalance = account.currentBalance - dailyPL;
  const dailyDrawdownUsed = dailyPL < 0 && startOfDayBalance > 0 ? (Math.abs(dailyPL) / startOfDayBalance) * 100 : 0;
  
  // Max Drawdown calculation
  const maxDrawdownUsed = profit < 0 && account.initialBalance > 0 ? (Math.abs(profit) / account.initialBalance) * 100 : 0;

  // Live progress calculation
  const liveTarget = account.liveTargetAmount || 0;
  const liveProfit = account.currentBalance - account.initialBalance;
  const liveProgress = liveTarget > 0 ? (liveProfit / liveTarget) * 100 : 0;

  // Status determination
  let status = account.status || 'active';
  if (isProp) {
    if (maxDrawdownUsed >= (account.maxDrawdown || 10)) status = 'failed';
    else if (dailyDrawdownUsed >= (account.dailyDrawdown || 4)) status = 'failed';
    else if (profitPercentage >= (account.profitTarget || 10)) status = 'passed';
  }

  const openTrades = trades
    .filter(t => t.status === 'open')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const closedTrades = trades
    .filter(t => t.status === 'closed')
    .sort((a, b) => new Date(b.closedAt || b.createdAt).getTime() - new Date(a.closedAt || a.createdAt).getTime());

  const winningTrades = closedTrades.filter(t => (t.profitLoss || 0) > 0);
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
            title="Back to portfolio"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
                {account.name}
              </h1>
              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                status === 'passed' ? 'bg-emerald-100 text-emerald-800' :
                status === 'failed' ? 'bg-rose-100 text-rose-800' : 'bg-blue-50 text-blue-700'
              }`}>
                {status}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {isProp ? `${account.propType || '2-Phase'} · Phase ${account.phase}` : account.type.toUpperCase()} · Base: {account.currency}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canWithdraw && (
            <button 
              onClick={onWithdraw}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              <Wallet size={14} className="text-slate-500" />
              <span>Withdraw</span>
            </button>
          )}

          <button 
            onClick={onAddTrade}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus size={14} className="stroke-[2.5]" />
            <span>Log Trade</span>
          </button>
        </div>
      </div>

      {/* Account Metric & Compliance Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Balance Card */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Account Balance</span>
          <div className="text-xl font-bold font-mono tracking-tight text-slate-900 mt-1">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: account.currency }).format(account.currentBalance)}
          </div>
          <p className="text-[11px] text-slate-500 font-mono mt-1">
            Initial: ${account.initialBalance.toLocaleString()}
          </p>
        </div>

        {/* Profit / Return */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Net Return</span>
          <div className={`text-xl font-bold font-mono tracking-tight mt-1 ${
            profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {profit >= 0 ? '+' : ''}${profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <p className={`text-[11px] font-mono font-medium mt-1 ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {profit >= 0 ? '+' : ''}{profitPercentage.toFixed(2)}% ROI
          </p>
        </div>

        {/* Win Rate */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Accuracy</span>
          <div className="text-xl font-bold font-mono tracking-tight text-slate-900 mt-1">
            {winRate.toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-500 font-mono mt-1">
            {winningTrades.length} W · {closedTrades.length - winningTrades.length} L
          </p>
        </div>

        {/* Open Exposure */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Floating Exposure</span>
          <div className="text-xl font-bold font-mono tracking-tight text-slate-900 mt-1">
            {openTrades.length} <span className="text-xs font-normal text-slate-500 font-sans">positions</span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono mt-1">
            Risk: ${openTrades.reduce((sum, t) => sum + (t.riskAmount || 0), 0).toFixed(0)}
          </p>
        </div>
      </div>

      {/* Prop Rules Compliance Bars (if prop or target exists) */}
      {isProp && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-100/60 p-4 rounded-xl border border-slate-200/80">
          {/* Target Progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Target size={13} className="text-emerald-600" />
                <span>Profit Target</span>
              </span>
              <span className="font-mono text-slate-600">
                {profitPercentage.toFixed(1)}% / {account.profitTarget}%
              </span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(Math.max(profitPercentage, 0) / (account.profitTarget || 10) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Daily Drawdown */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <ShieldAlert size={13} className="text-amber-600" />
                <span>Daily Drawdown</span>
              </span>
              <span className="font-mono text-slate-600">
                {dailyDrawdownUsed.toFixed(1)}% / {account.dailyDrawdown}%
              </span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  dailyDrawdownUsed > (account.dailyDrawdown || 4) * 0.75 ? 'bg-rose-500' : 'bg-slate-800'
                }`}
                style={{ width: `${Math.min(dailyDrawdownUsed / (account.dailyDrawdown || 4) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Max Drawdown */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <ShieldAlert size={13} className="text-rose-600" />
                <span>Max Drawdown</span>
              </span>
              <span className="font-mono text-slate-600">
                {maxDrawdownUsed.toFixed(1)}% / {account.maxDrawdown}%
              </span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  maxDrawdownUsed > (account.maxDrawdown || 10) * 0.75 ? 'bg-rose-500' : 'bg-slate-800'
                }`}
                style={{ width: `${Math.min(maxDrawdownUsed / (account.maxDrawdown || 10) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="border-b border-slate-200">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('log')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'log'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Positions &amp; Ledger ({trades.length})
          </button>

          <button
            onClick={() => setActiveTab('risk')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'risk'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Risk Calculator
          </button>

          <button
            onClick={() => setActiveTab('insights')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'insights'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Strategy Insights
          </button>

          {canWithdraw && (
            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'withdrawals'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Withdrawals ({withdrawals.length})
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Trade Log / Ledger */}
      {activeTab === 'log' && (
        <div className="space-y-8">
          
          {/* Active Open Positions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Active Positions</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                  {openTrades.length}
                </span>
              </h3>
            </div>

            {openTrades.length === 0 ? (
              <div className="py-8 bg-white border border-dashed border-slate-200 rounded-xl text-center">
                <p className="text-xs text-slate-500 font-medium">No active positions open</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Click "+ Log Trade" to record a new position</p>
              </div>
            ) : (
              <>
                {/* Desktop High-Density Table */}
                <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px]">
                        <th className="py-3 px-4 font-semibold">Date</th>
                        <th className="py-3 px-4 font-semibold">Pair</th>
                        <th className="py-3 px-4 font-semibold">Direction</th>
                        <th className="py-3 px-4 font-semibold">Entry</th>
                        <th className="py-3 px-4 font-semibold">Lots</th>
                        <th className="py-3 px-4 font-semibold">Analysis By</th>
                        <th className="py-3 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {openTrades.map(trade => (
                        <tr key={trade.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 text-slate-600 font-mono">
                            {new Date(trade.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 font-bold font-mono text-slate-900">
                            {trade.pair}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              trade.type === 'buy' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {trade.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700">
                            {trade.entryPrice}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                            {trade.lotSize}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {trade.analysisBy || 'None'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setConfirmTrade(trade)}
                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-medium transition-colors"
                              >
                                Close &amp; Record PnL
                              </button>
                              <button
                                onClick={() => onDeleteTrade(trade.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                title="Delete position"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Responsive Transaction Cards */}
                <div className="md:hidden space-y-2.5">
                  {openTrades.map(trade => (
                    <div key={trade.id} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-sm text-slate-900">{trade.pair}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            trade.type === 'buy' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {trade.type}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(trade.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2 rounded-lg font-mono">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">Entry Price</span>
                          <span className="font-semibold text-slate-800">{trade.entryPrice}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">Lot Size</span>
                          <span className="font-semibold text-slate-800">{trade.lotSize} lots</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => setConfirmTrade(trade)}
                          className="flex-grow py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold text-center"
                        >
                          Close Position &amp; PnL
                        </button>
                        <button
                          onClick={() => onDeleteTrade(trade.id)}
                          className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Closed Trade History Ledger */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Trade History Ledger</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                  {closedTrades.length}
                </span>
              </h3>
            </div>

            {closedTrades.length === 0 ? (
              <div className="py-10 bg-white border border-dashed border-slate-200 rounded-xl text-center">
                <p className="text-xs text-slate-500 font-medium">No trade history recorded yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Closed positions will populate this ledger with metrics &amp; screenshots</p>
              </div>
            ) : (
              <>
                {/* Desktop History Table */}
                <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px]">
                        <th className="py-3 px-4 font-semibold">Closed Date</th>
                        <th className="py-3 px-4 font-semibold">Asset Pair</th>
                        <th className="py-3 px-4 font-semibold">Direction</th>
                        <th className="py-3 px-4 font-semibold">Entry / Exit</th>
                        <th className="py-3 px-4 font-semibold">Lots</th>
                        <th className="py-3 px-4 font-semibold">Net P&amp;L</th>
                        <th className="py-3 px-4 font-semibold">Analysis</th>
                        <th className="py-3 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {closedTrades.map(trade => (
                        <tr key={trade.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 text-slate-600 font-mono">
                            {new Date(trade.closedAt || trade.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 font-bold font-mono text-slate-900">
                            {trade.pair}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              trade.type === 'buy' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {trade.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {trade.entryPrice} → {trade.exitPrice || '-'}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700">
                            {trade.lotSize || '-'}
                          </td>
                          <td className={`py-3 px-4 font-mono font-bold ${
                            (trade.profitLoss || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {(trade.profitLoss || 0) >= 0 ? '+' : ''}${trade.profitLoss?.toLocaleString() || '0'}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {trade.analysisBy || 'None'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => onViewTrade(trade)}
                                className="px-2 py-1 text-slate-600 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-100 text-[11px]"
                              >
                                View
                              </button>
                              <button
                                onClick={() => onDeleteTrade(trade.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                title="Delete trade record"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile History Cards */}
                <div className="md:hidden space-y-2.5">
                  {closedTrades.map(trade => (
                    <div 
                      key={trade.id} 
                      onClick={() => onViewTrade(trade)}
                      className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs cursor-pointer active:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-sm text-slate-900">{trade.pair}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            trade.type === 'buy' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {trade.type}
                          </span>
                        </div>
                        <span className={`text-sm font-mono font-bold ${
                          (trade.profitLoss || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {(trade.profitLoss || 0) >= 0 ? '+' : ''}${trade.profitLoss?.toLocaleString() || '0'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 font-mono mt-2 pt-2 border-t border-slate-100">
                        <span>{new Date(trade.closedAt || trade.createdAt).toLocaleDateString()}</span>
                        <span>{trade.lotSize} lots · {trade.analysisBy || 'Self'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Risk Calculator */}
      {activeTab === 'risk' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <RiskCalculator 
            initialBalance={account.initialBalance}
            currentBalance={account.currentBalance} 
            currency={account.currency} 
            accountType={account.type}
            defaultDrawdownType={account.drawdownType}
            defaultDrawdownValue={account.drawdownValue || account.maxDrawdown}
            openRisk={trades.filter(t => t.status === 'open').reduce((sum, t) => sum + (t.riskAmount || 0), 0)}
          />
        </div>
      )}

      {/* Tab 3: Insights */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Performance by Strategy / Analyst
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Identify which trading setups produce positive expectancy
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from(new Set(trades.map(t => t.analysisBy || 'None'))).map(analyst => {
                const analystTrades = trades.filter(t => (t.analysisBy || 'None') === analyst && t.status === 'closed');
                const total = analystTrades.length;
                const wins = analystTrades.filter(t => (t.profitLoss || 0) > 0).length;
                const totalPL = analystTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
                const wr = total > 0 ? (wins / total) * 100 : 0;

                return (
                  <div key={analyst} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-slate-900">{analyst}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{total} trades</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Win Rate</span>
                        <span className="font-bold text-slate-800">{wr.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">Net P&amp;L</span>
                        <span className={`font-bold ${totalPL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {totalPL >= 0 ? '+' : ''}${totalPL.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mt-1">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${wr}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Withdrawals */}
      {activeTab === 'withdrawals' && canWithdraw && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Withdrawals History</h3>
              <p className="text-xs text-slate-500">Realized payouts and withdrawals from live capital</p>
            </div>
            <button
              onClick={onWithdraw}
              className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
            >
              New Withdrawal
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px]">
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Amount</th>
                  <th className="py-3 px-4 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400 text-xs">
                      No withdrawals requested yet
                    </td>
                  </tr>
                ) : (
                  withdrawals.map(w => (
                    <tr key={w.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {new Date(w.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-rose-600">
                        -${w.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {w.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirm Trade Dialog */}
      {confirmTrade && (
        <ConfirmTradeDialog 
          isOpen={!!confirmTrade}
          onClose={() => setConfirmTrade(null)}
          onConfirm={onUpdateTrade}
          trade={confirmTrade}
          account={account}
        />
      )}
    </div>
  );
}
