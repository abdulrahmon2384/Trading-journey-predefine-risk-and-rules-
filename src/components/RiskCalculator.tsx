import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, AlertTriangle, CheckCircle, Calculator, Info } from 'lucide-react';

interface RiskCalculatorProps {
  initialBalance: number;
  currentBalance: number;
  currency: string;
  accountType?: 'prop' | 'live' | 'prop-live';
  defaultDrawdownType?: DrawdownType;
  defaultDrawdownValue?: number;
  openRisk?: number;
}

type DrawdownType = 'percentage' | 'fixed' | 'trailing';

export default function RiskCalculator({ 
  initialBalance,
  currentBalance, 
  currency, 
  accountType = 'prop',
  defaultDrawdownType = 'percentage',
  defaultDrawdownValue = 10,
  openRisk = 0
}: RiskCalculatorProps) {
  const [drawdownType, setDrawdownType] = useState<DrawdownType>(defaultDrawdownType);
  const [drawdownValue, setDrawdownValue] = useState<string>(defaultDrawdownValue.toString());
  const [edd, setEdd] = useState<number>(0);

  const isLive = accountType === 'live';
  const isPropLive = accountType === 'prop-live';

  const effectiveBalance = currentBalance - openRisk;

  const propTiers = [
    { name: 'Tier 1 (10%+)', threshold: 10, riskFactor: 0.30, basePercent: 0.10, label: 'Safe', color: 'emerald' },
    { name: 'Tier 2 (6%+)', threshold: 6, riskFactor: 0.34, basePercent: 0.06, label: 'Caution', color: 'blue' },
    { name: 'Tier 3 (3%+)', threshold: 3, riskFactor: 0.34, basePercent: 0.03, label: 'Warning', color: 'amber' },
    { name: 'Tier 4 (<3%)', threshold: 0, riskFactor: 1, basePercent: 0.0066, label: 'Critical', color: 'rose' },
  ];

  const liveTiers = [
    { name: 'Tier 1660+', threshold: 1660, risk: 160, label: 'Safe', color: 'emerald' },
    { name: 'Tier 880+', threshold: 880, risk: 80, label: 'Safe', color: 'emerald' },
    { name: 'Tier 440+', threshold: 440, risk: 40, label: 'Safe', color: 'emerald' },
    { name: 'Tier 220+', threshold: 220, risk: 20, label: 'Caution', color: 'blue' },
    { name: 'Tier 110+', threshold: 110, risk: 10, label: 'Caution', color: 'blue' },
    { name: 'Tier 15+', threshold: 15, risk: 5, label: 'Warning', color: 'amber' },
    { name: 'Tier <15', threshold: 0, risk: 2.5, label: 'Critical', color: 'rose' },
  ];

  const exampleAccounts = [5000, 10000, 25000, 50000, 100000, 200000, 300000];

  useEffect(() => {
    const val = parseFloat(drawdownValue) || 0;
    let calculatedEdd = 0;

    if (drawdownType === 'percentage') {
      calculatedEdd = currentBalance * (val / 100);
    } else if (drawdownType === 'fixed') {
      calculatedEdd = val;
    } else if (drawdownType === 'trailing') {
      calculatedEdd = Math.max(0, currentBalance - val);
    }

    setEdd(calculatedEdd);
  }, [drawdownType, drawdownValue, currentBalance]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  const remainingDDAmount = (currentBalance - initialBalance) + edd - openRisk;
  const remainingDDPercent = initialBalance > 0 ? (remainingDDAmount / initialBalance) * 100 : 0;

  const currentPropTier = propTiers.find(t => remainingDDPercent >= t.threshold) || propTiers[propTiers.length - 1];
  const currentLiveTier = liveTiers.find(t => effectiveBalance >= t.threshold) || liveTiers[liveTiers.length - 1];
  
  // Prop Live Logic
  const maxDDPercent = defaultDrawdownValue;
  const initialDDAmount = initialBalance * (maxDDPercent / 100);
  const propLiveProfit = currentBalance - initialBalance;
  const availableBuffer = (initialDDAmount + propLiveProfit) - openRisk;
  const propLiveThreshold = initialDDAmount * 0.60;
  
  let propLiveRisk = 0;
  if (availableBuffer <= propLiveThreshold) {
    propLiveRisk = initialDDAmount * 0.06;
  } else {
    propLiveRisk = availableBuffer * 0.10;
  }

  const recommendedRisk = isLive 
    ? currentLiveTier.risk 
    : isPropLive
    ? propLiveRisk
    : currentPropTier.riskFactor * (currentPropTier.basePercent * initialBalance);

  return (
    <div className="space-y-6">
      {/* Top Banner / Risk Parameters */}
      {!isLive && !isPropLive && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Inputs & Effective Margin */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calculator size={15} className="text-slate-600" />
                <span>Drawdown Governance Rules</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Configure your risk parameters to match prop firm evaluation constraints</p>
            </div>
            
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Drawdown Calculation Type</label>
                <select 
                  value={drawdownType} 
                  onChange={(e) => setDrawdownType(e.target.value as DrawdownType)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="percentage">Percentage of Balance (%)</option>
                  <option value="fixed">Fixed Capital Amount ($)</option>
                  <option value="trailing">Trailing Equity Level</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  {drawdownType === 'percentage' ? 'Max Drawdown Percentage (%)' : 
                   drawdownType === 'fixed' ? 'Total Drawdown Value ($)' : 'Trailing Stop Level ($)'}
                </label>
                <input 
                  type="number" 
                  value={drawdownValue} 
                  onChange={(e) => setDrawdownValue(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder={drawdownType === 'percentage' ? '10' : '1000'}
                />
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-2 font-mono text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-sans text-[11px]">Effective Drawdown (EDD)</span>
                  <span className="font-bold text-slate-900">{formatCurrency(edd)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-sans text-[11px]">Remaining Margin to Breach</span>
                  <span className={`font-bold ${remainingDDAmount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatCurrency(remainingDDAmount)} ({remainingDDPercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Current Recommended Risk Card */}
          <div className="bg-slate-950 text-white rounded-xl p-5 flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Algorithm Recommendation
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-emerald-400 border border-slate-700">
                  {currentPropTier.name}
                </span>
              </div>

              <div className="mt-4">
                <span className="text-xs text-slate-400 block font-sans">Suggested Max Risk per Trade</span>
                <div className="text-3xl font-bold font-mono tracking-tight text-white mt-1">
                  {formatCurrency(recommendedRisk)}
                </div>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  ~{((recommendedRisk / initialBalance) * 100).toFixed(2)}% of starting capital
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle size={13} />
                <span>Tier Risk Factor: {currentPropTier.riskFactor * 100}%</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Formula safely scales risk down automatically as remaining drawdown shrinks.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Live Account Mode Card */}
      {isLive && (
        <div className="bg-slate-950 text-white rounded-xl p-5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Tiered Capital Protection Matrix</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-emerald-400">
                {currentLiveTier.name}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Live Balance: {formatCurrency(currentBalance)} · Open Risk: {formatCurrency(openRisk)} · Effective: {formatCurrency(effectiveBalance)}
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[11px] text-slate-400 block">Recommended Position Risk</span>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {formatCurrency(recommendedRisk)}
            </div>
          </div>
        </div>
      )}

      {/* Prop Live Mode Card */}
      {isPropLive && (
        <div className="bg-slate-950 text-white rounded-xl p-5 shadow-md space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">Funded Account Buffer Strategy</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Available Buffer: {formatCurrency(availableBuffer)} · Threshold: {formatCurrency(propLiveThreshold)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Suggested Risk</span>
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {formatCurrency(recommendedRisk)}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-900 rounded-lg text-xs text-slate-300 font-mono">
            {availableBuffer <= propLiveThreshold 
              ? `Buffer is below 60% threshold. Operating in defensive mode (Risking 6% of initial drawdown: ${formatCurrency(initialDDAmount * 0.06)}).`
              : `Buffer is healthy. Operating in growth mode (Risking 10% of total available buffer: ${formatCurrency(availableBuffer * 0.10)}).`}
          </div>
        </div>
      )}

      {/* Tier Matrix Table */}
      {!isPropLive && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-0">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {isLive ? 'Live Capital Stepping Tiers' : 'Prop Firm Drawdown Tiers & Sizing'}
            </h4>
            <span className="text-[11px] text-slate-500 font-mono">Dynamic Expectancy Model</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-[11px]">
                  <th className="py-2.5 px-4 font-semibold">Tier Category</th>
                  {!isLive && <th className="py-2.5 px-4 font-semibold">Calculation Basis</th>}
                  <th className="py-2.5 px-4 font-semibold">Maximum Risk per Trade</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Protection Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {(isLive ? liveTiers : propTiers).map((tier: any) => {
                  const riskAmount = isLive ? tier.risk : tier.riskFactor * (tier.basePercent * initialBalance);
                  const isActive = isLive ? currentLiveTier.name === tier.name : currentPropTier.name === tier.name;

                  return (
                    <tr 
                      key={tier.name} 
                      className={`transition-colors ${isActive ? 'bg-slate-100/80 font-bold' : 'hover:bg-slate-50/50'}`}
                    >
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${
                          isActive ? 'bg-slate-900 text-white' : 'text-slate-800'
                        }`}>
                          {tier.name}
                        </span>
                      </td>

                      {!isLive && (
                        <td className="py-2.5 px-4 text-slate-500 text-[11px] font-sans">
                          {tier.riskFactor * 100}% × {(tier.basePercent * 100).toFixed(1)}% of Capital
                        </td>
                      )}

                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        {formatCurrency(riskAmount)}
                      </td>

                      <td className="py-2.5 px-4 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-sans uppercase ${
                          tier.label === 'Safe' ? 'bg-emerald-100 text-emerald-800' :
                          tier.label === 'Caution' ? 'bg-blue-100 text-blue-800' :
                          tier.label === 'Warning' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {tier.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Account Scaling Reference */}
      {!isLive && !isPropLive && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-0">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Benchmark Scaling Model across Account Sizes
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-[11px]">
                  <th className="py-2.5 px-4 font-semibold">Account Size</th>
                  <th className="py-2.5 px-4 font-semibold text-emerald-700">Tier 1 (Safe 3%)</th>
                  <th className="py-2.5 px-4 font-semibold text-blue-700">Tier 2 (2.04%)</th>
                  <th className="py-2.5 px-4 font-semibold text-amber-700">Tier 3 (1.02%)</th>
                  <th className="py-2.5 px-4 font-semibold text-rose-700">Tier 4 (Critical 0.66%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exampleAccounts.map(size => (
                  <tr key={size} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-slate-900">{formatCurrency(size)}</td>
                    <td className="py-2.5 px-4 text-emerald-600 font-semibold">{formatCurrency(size * 0.03)}</td>
                    <td className="py-2.5 px-4 text-blue-600">{formatCurrency(size * 0.0204)}</td>
                    <td className="py-2.5 px-4 text-amber-600">{formatCurrency(size * 0.0102)}</td>
                    <td className="py-2.5 px-4 text-rose-600 font-bold">{formatCurrency(size * 0.0066)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
