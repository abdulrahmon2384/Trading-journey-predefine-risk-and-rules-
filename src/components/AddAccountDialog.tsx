import React, { useState } from 'react';
import { AccountType } from '@/src/types';
import { X, Layers, ShieldCheck, DollarSign } from 'lucide-react';

interface AddAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (account: any) => void;
}

export default function AddAccountDialog({ isOpen, onClose, onAdd }: AddAccountDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('prop');
  const [propType, setPropType] = useState<'1-phase' | '2-phase'>('2-phase');
  const [phase, setPhase] = useState('1');
  const [initialBalance, setInitialBalance] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Custom prop parameters
  const [maxDrawdown, setMaxDrawdown] = useState('10');
  const [dailyDrawdown, setDailyDrawdown] = useState('4');
  const [profitTarget, setProfitTarget] = useState('10');
  const [drawdownType, setDrawdownType] = useState<'percentage' | 'fixed' | 'trailing'>('percentage');
  const [drawdownValue, setDrawdownValue] = useState('10');
  const [liveTargetAmount, setLiveTargetAmount] = useState('');

  if (!isOpen) return null;

  const handlePropTypeChange = (val: '1-phase' | '2-phase') => {
    setPropType(val);
    if (val === '1-phase') {
      setMaxDrawdown('6');
      setDrawdownValue('6');
      setDailyDrawdown('4');
      setProfitTarget('10');
    } else {
      setMaxDrawdown('10');
      setDrawdownValue('10');
      setDailyDrawdown('4');
      setProfitTarget(phase === '1' ? '10' : '5');
    }
  };

  const handlePhaseChange = (val: string) => {
    setPhase(val);
    if (propType === '2-phase') {
      setProfitTarget(val === '1' ? '10' : '5');
    }
  };

  const handlePresetBalance = (val: number) => {
    setInitialBalance(val.toString());
    if (!currentBalance || currentBalance === initialBalance) {
      setCurrentBalance(val.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const parsedInitial = parseFloat(initialBalance);
    const parsedCurrent = parseFloat(currentBalance || initialBalance);
    
    if (isNaN(parsedInitial) || parsedInitial <= 0) {
      setError("Please enter a valid starting capital balance.");
      return;
    }

    setIsSubmitting(true);
    
    const safeParse = (val: string) => {
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    };

    try {
      await onAdd({
        name: name.trim() || `${currency} ${parsedInitial.toLocaleString()} Account`,
        type,
        propType: type === 'prop' ? propType : null,
        phase: type === 'prop' ? parseInt(phase) : null,
        maxDrawdown: type === 'prop' ? safeParse(maxDrawdown) : null,
        dailyDrawdown: type === 'prop' ? safeParse(dailyDrawdown) : null,
        profitTarget: type === 'prop' ? safeParse(profitTarget) : null,
        drawdownType,
        drawdownValue: safeParse(drawdownValue) || 0,
        liveTargetAmount: type === 'live' ? safeParse(liveTargetAmount) : null,
        initialBalance: parsedInitial,
        currentBalance: parsedCurrent,
        currency,
        status: 'active',
        createdAt: new Date().toISOString()
      });
      onClose();
      setName('');
      setType('prop');
      setPhase('1');
      setInitialBalance('');
      setCurrentBalance('');
    } catch (err: any) {
      console.error("Submit error:", err);
      setError(err.message || "Failed to create account. Please check your data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Layers size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add Trading Account</h2>
              <p className="text-xs text-slate-500">Configure parameters, prop firm limits &amp; initial capital</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Account Category Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Account Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('prop')}
                className={`py-2 px-2.5 text-xs font-medium rounded-lg border text-center transition-all ${
                  type === 'prop' 
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs' 
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Prop Firm
              </button>
              <button
                type="button"
                onClick={() => setType('live')}
                className={`py-2 px-2.5 text-xs font-medium rounded-lg border text-center transition-all ${
                  type === 'live' 
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs' 
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Live Broker
              </button>
              <button
                type="button"
                onClick={() => setType('prop-live')}
                className={`py-2 px-2.5 text-xs font-medium rounded-lg border text-center transition-all ${
                  type === 'prop-live' 
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs' 
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Funded Live
              </button>
            </div>
          </div>

          {/* Account Name */}
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-xs font-semibold text-slate-700">Account Label</label>
            <input 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. FTMO $100K Phase 1 / IC Markets Live" 
              required 
              className="w-full bg-slate-50/50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white" 
            />
          </div>

          {/* Prop Specific Details */}
          {type === 'prop' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Challenge Format</label>
                <select 
                  value={propType} 
                  onChange={(e) => handlePropTypeChange(e.target.value as '1-phase' | '2-phase')}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                >
                  <option value="2-phase">2-Phase Standard</option>
                  <option value="1-phase">1-Phase Evaluation</option>
                </select>
              </div>

              {propType === '2-phase' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Current Phase</label>
                  <select 
                    value={phase} 
                    onChange={(e) => handlePhaseChange(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="1">Phase 1 (Target: 10%)</option>
                    <option value="2">Phase 2 (Target: 5%)</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Quick Balance Presets */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Starting Balance Presets</label>
            <div className="flex flex-wrap gap-1.5">
              {[10000, 25000, 50000, 100000, 200000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handlePresetBalance(amt)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors ${
                    initialBalance === amt.toString()
                      ? 'bg-slate-900 border-slate-900 text-white font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  ${(amt / 1000).toFixed(0)}K
                </button>
              ))}
            </div>
          </div>

          {/* Balance & Currency Inputs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Initial Balance</label>
              <input 
                type="number" 
                step="any" 
                required
                value={initialBalance} 
                onChange={(e) => {
                  setInitialBalance(e.target.value);
                  if (!currentBalance) setCurrentBalance(e.target.value);
                }}
                placeholder="100000" 
                className="w-full bg-slate-50/50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Currency</label>
              <select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-medium text-slate-900 focus:outline-none"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AUD">AUD ($)</option>
                <option value="CAD">CAD ($)</option>
              </select>
            </div>
          </div>

          {/* Current Balance (Optional override) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Current Balance (if ongoing)</label>
            <input 
              type="number" 
              step="any"
              value={currentBalance} 
              onChange={(e) => setCurrentBalance(e.target.value)} 
              placeholder={initialBalance || "Same as initial balance"} 
              className="w-full bg-slate-50/50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white" 
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex gap-2.5">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
