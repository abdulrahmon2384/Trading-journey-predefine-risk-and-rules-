import React, { useState, useRef, useEffect } from 'react';
import { Account, Trade } from '../types';
import ImageCropper from './ImageCropper';
import { calculatePipValue, isIndexOrCrypto, isCommodity } from '../services/forexService';
import { X, TrendingUp, AlertCircle, Upload, Image as ImageIcon, CheckCircle, Calculator } from 'lucide-react';

interface AddTradeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (trade: any) => void;
  account: Account;
  trades: Trade[];
}

export default function AddTradeDialog({ isOpen, onClose, onAdd, account, trades }: AddTradeDialogProps) {
  const [selectedPair, setSelectedPair] = useState('EURUSD');
  const [customPair, setCustomPair] = useState('');
  const [type, setType] = useState<'buy' | 'sell'>('buy');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [lotSize, setLotSize] = useState<number | null>(null);
  const [actualRisk, setActualRisk] = useState<number | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  
  const [imageUrl, setImageUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [analysisBy, setAnalysisBy] = useState('None');
  const [customAnalysisBy, setCustomAnalysisBy] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPair = selectedPair === 'CUSTOM' ? customPair : selectedPair;

  // Check if already traded today (Prop Rule)
  const today = new Date().toLocaleDateString();
  const hasTradedToday = account?.type === 'prop' && trades ? trades.some(t => new Date(t.createdAt).toLocaleDateString() === today) : false;

  // Calculate Effective Drawdown (EDD) and Risk Amount based on Account Type
  const riskCalculation = React.useMemo(() => {
    if (!account) return { edd: 0, risk: 0, remainingDDPercent: 0, remainingDDAmount: 0, openRisk: 0 };
    
    const initialBalance = account.initialBalance;
    const currentBalance = account.currentBalance;

    const openTrades = trades?.filter(t => t.status === 'open') || [];
    const openRiskTotal = openTrades.reduce((sum, t) => sum + (t.riskAmount || 0), 0);

    if (account.type === 'live') {
      const effectiveBalance = currentBalance - openRiskTotal;
      let risk = 2.5;
      if (effectiveBalance >= 1660) risk = 160;
      else if (effectiveBalance >= 880) risk = 80;
      else if (effectiveBalance >= 440) risk = 40;
      else if (effectiveBalance >= 220) risk = 20;
      else if (effectiveBalance >= 110) risk = 10;
      else if (effectiveBalance >= 15) risk = 5;
      else risk = 2.5;

      return {
        edd: 0,
        risk,
        remainingDDPercent: 0,
        remainingDDAmount: effectiveBalance,
        openRisk: openRiskTotal
      };
    }

    if (account.type === 'prop-live') {
      const maxDDPercent = account.drawdownValue || account.maxDrawdown || 10;
      const initialDDAmount = initialBalance * (maxDDPercent / 100);
      const propLiveProfit = currentBalance - initialBalance;
      const availableBuffer = (initialDDAmount + propLiveProfit) - openRiskTotal;
      const threshold = initialDDAmount * 0.60;

      let risk = 0;
      if (availableBuffer <= threshold) {
        risk = initialDDAmount * 0.06;
      } else {
        risk = availableBuffer * 0.10;
      }

      return {
        edd: initialDDAmount,
        risk,
        remainingDDPercent: 0,
        remainingDDAmount: availableBuffer,
        openRisk: openRiskTotal
      };
    }

    // Default Prop Account
    const ddType = account.drawdownType || 'percentage';
    const ddVal = account.drawdownValue !== undefined ? account.drawdownValue : (account.maxDrawdown || 10);
    
    let calculatedEdd = 0;
    if (ddType === 'percentage') {
      calculatedEdd = currentBalance * (ddVal / 100);
    } else if (ddType === 'fixed') {
      calculatedEdd = ddVal;
    } else if (ddType === 'trailing') {
      calculatedEdd = Math.max(0, currentBalance - ddVal);
    }

    const remainingDDAmount = (currentBalance - initialBalance) + calculatedEdd - openRiskTotal;
    const remainingDDPercent = (remainingDDAmount / initialBalance) * 100;

    const propTiers = [
      { threshold: 10, riskFactor: 0.30, basePercent: 0.10 },
      { threshold: 6, riskFactor: 0.34, basePercent: 0.06 },
      { threshold: 3, riskFactor: 0.34, basePercent: 0.03 },
      { threshold: 0, riskFactor: 1, basePercent: 0.0066 },
    ];

    const currentTier = propTiers.find(t => remainingDDPercent >= t.threshold) || propTiers[propTiers.length - 1];
    const risk = currentTier.riskFactor * (currentTier.basePercent * initialBalance);

    return {
      edd: calculatedEdd,
      risk,
      remainingDDPercent,
      remainingDDAmount,
      openRisk: openRiskTotal
    };
  }, [account, trades]);

  const riskAmount = Math.round(riskCalculation.risk * 100) / 100;
  const eddAmount = riskCalculation.edd;
  const remainingDDPercent = riskCalculation.remainingDDPercent;
  const openRiskTotal = riskCalculation.openRisk;

  // Lot Size and Actual Risk Calculation Logic
  useEffect(() => {
    const calculateLots = async () => {
      if (!isOpen || !account || !entryPrice || !stopLoss || !currentPair) {
        setLotSize(null);
        setActualRisk(null);
        setWarning(null);
        return;
      }

      const entry = parseFloat(entryPrice);
      const sl = parseFloat(stopLoss);
      const targetRisk = riskAmount;
      
      if (isNaN(entry) || isNaN(sl)) {
        setLotSize(null);
        setActualRisk(null);
        return;
      }

      if (targetRisk <= 0) {
        setLotSize(null);
        setActualRisk(null);
        setWarning("Risk amount must be greater than 0.");
        return;
      }

      const diff = Math.abs(entry - sl);
      if (diff === 0) {
        setLotSize(null);
        setActualRisk(null);
        setWarning("Entry and SL cannot be identical");
        return;
      }

      let calculatedLots = 0;
      const pairUpper = currentPair.toUpperCase();

      if (isCommodity(pairUpper)) {
        if (pairUpper.includes('XAU') || pairUpper.includes('GOLD')) {
          calculatedLots = targetRisk / (100 * diff);
        } else if (pairUpper.includes('OIL') || pairUpper.includes('WTI') || pairUpper.includes('BRENT')) {
          calculatedLots = targetRisk / (1000 * diff);
        } else {
          calculatedLots = targetRisk / (5000 * diff);
        }
      } else if (isIndexOrCrypto(pairUpper)) {
        calculatedLots = targetRisk / diff;
      } else {
        const isJpy = pairUpper.includes('JPY');
        const pipSize = isJpy ? 0.01 : 0.0001;
        const pips = diff / pipSize;
        const pipValuePerLot = await calculatePipValue(pairUpper, account.currency || 'USD');
        calculatedLots = targetRisk / (pips * pipValuePerLot);
      }

      const finalLots = Math.floor(calculatedLots * 100) / 100;
      
      if (finalLots < 0.01) {
        setLotSize(0);
        setActualRisk(0);
        setWarning("Stop loss distance requires less than 0.01 minimum lot. Increase SL distance.");
        return;
      }

      setLotSize(finalLots);

      let actual = 0;
      if (isCommodity(pairUpper)) {
        if (pairUpper.includes('XAU') || pairUpper.includes('GOLD')) {
          actual = finalLots * 100 * diff;
        } else if (pairUpper.includes('OIL') || pairUpper.includes('WTI') || pairUpper.includes('BRENT')) {
          actual = finalLots * 1000 * diff;
        } else {
          actual = finalLots * 5000 * diff;
        }
      } else if (isIndexOrCrypto(pairUpper)) {
        actual = finalLots * diff;
      } else {
        const isJpy = pairUpper.includes('JPY');
        const pipSize = isJpy ? 0.01 : 0.0001;
        const pips = diff / pipSize;
        const pipValuePerLot = await calculatePipValue(pairUpper, account.currency || 'USD');
        actual = pips * pipValuePerLot * finalLots;
      }

      setActualRisk(Math.round(actual * 100) / 100);
      setWarning(null);
    };

    calculateLots();
  }, [entryPrice, stopLoss, currentPair, riskAmount, isOpen, account]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (lotSize === 0) {
      setError("Cannot record trade with 0.00 lots.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd({
        pair: currentPair.toUpperCase(),
        type,
        entryPrice: parseFloat(entryPrice),
        stopLoss: parseFloat(stopLoss),
        takeProfit: takeProfit ? parseFloat(takeProfit) : null,
        lotSize: lotSize || 0,
        riskAmount: actualRisk || riskAmount,
        status: 'open',
        imageUrl,
        notes,
        analysisBy: analysisBy === 'Custom' ? customAnalysisBy : analysisBy,
        createdAt: new Date().toISOString()
      });
      onClose();
      setSelectedPair('EURUSD');
      setCustomPair('');
      setEntryPrice('');
      setStopLoss('');
      setTakeProfit('');
      setLotSize(null);
      setImageUrl('');
      setNotes('');
      setAnalysisBy('None');
      setCustomAnalysisBy('');
    } catch (err: any) {
      console.error("Trade submit error:", err);
      setError(err.message || "Failed to log trade.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5 my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Execute &amp; Log Trade</h2>
              <p className="text-xs text-slate-500 font-mono">
                {account.name} · Risk: ${riskAmount}
              </p>
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

        {hasTradedToday ? (
          <div className="space-y-4 py-4 text-center">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold">
              Prop Firm Daily Rule Triggered: You have already logged a trade today. Preserve your capital and resume tomorrow.
            </div>
            <button 
              onClick={onClose} 
              className="w-full py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-lg"
            >
              Dismiss
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            {/* Asset Pair & Direction */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Currency / Asset Pair</label>
                <select 
                  value={selectedPair} 
                  onChange={(e) => setSelectedPair(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="EURUSD">EURUSD</option>
                  <option value="GBPUSD">GBPUSD</option>
                  <option value="USDJPY">USDJPY</option>
                  <option value="XAUUSD">GOLD (XAUUSD)</option>
                  <option value="NAS100">NAS100 (US TECH)</option>
                  <option value="SPX500">SPX500</option>
                  <option value="USOIL">USOIL (CRUDE)</option>
                  <option value="BTCUSD">BTCUSD</option>
                  <option value="CUSTOM">Custom Symbol...</option>
                </select>
                {selectedPair === 'CUSTOM' && (
                  <input 
                    value={customPair} 
                    onChange={(e) => setCustomPair(e.target.value)} 
                    placeholder="E.g. AUDCAD" 
                    required 
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold mt-1 uppercase" 
                  />
                )}
              </div>

              {/* Direction Segmented Toggle */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Direction</label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setType('buy')}
                    className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                      type === 'buy' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    BUY / LONG
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('sell')}
                    className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                      type === 'sell' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    SELL / SHORT
                  </button>
                </div>
              </div>
            </div>

            {/* Price Inputs: Entry, SL, TP */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Entry Price *</label>
                <input 
                  type="number" 
                  step="any" 
                  required
                  value={entryPrice} 
                  onChange={(e) => setEntryPrice(e.target.value)} 
                  placeholder="1.0850" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Stop Loss (SL) *</label>
                <input 
                  type="number" 
                  step="any" 
                  required
                  value={stopLoss} 
                  onChange={(e) => setStopLoss(e.target.value)} 
                  placeholder="1.0820" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Take Profit (TP)</label>
                <input 
                  type="number" 
                  step="any"
                  value={takeProfit} 
                  onChange={(e) => setTakeProfit(e.target.value)} 
                  placeholder="1.0920" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white" 
                />
              </div>
            </div>

            {/* Calculated Lots & Risk Strip */}
            <div className="p-3.5 bg-slate-950 text-white rounded-xl grid grid-cols-2 gap-3 items-center">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                  Target Max Risk
                </span>
                <span className="text-lg font-bold font-mono text-white">
                  ${riskAmount.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                  Calculated Position Lots
                </span>
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  {lotSize !== null ? `${lotSize} Lots` : '--'}
                </span>
              </div>
            </div>

            {warning && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] font-medium flex items-center gap-1.5">
                <AlertCircle size={14} className="shrink-0" />
                <span>{warning}</span>
              </div>
            )}

            {/* Strategy / Analysis By */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Trading Setup / Strategy By</label>
              <select 
                value={analysisBy} 
                onChange={(e) => setAnalysisBy(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none"
              >
                <option value="None">Independent / Discretionary</option>
                <option value="Abdulrahmon">Abdulrahmon</option>
                <option value="Kelvin">Kelvin</option>
                <option value="ME">Personal Model</option>
                <option value="Custom">Custom Analyst Name...</option>
              </select>
              {analysisBy === 'Custom' && (
                <input 
                  value={customAnalysisBy} 
                  onChange={(e) => setCustomAnalysisBy(e.target.value)} 
                  placeholder="Enter analyst name" 
                  required 
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs mt-1" 
                />
              )}
            </div>

            {/* Screenshot Upload Dropzone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Setup Screenshot (Pre-Execution)</label>
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 text-center">
                {imageUrl ? (
                  <div className="space-y-2">
                    <img 
                      src={imageUrl} 
                      alt="Chart Preview" 
                      className="max-h-36 mx-auto rounded-lg border border-slate-200 object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setImageUrl('')} 
                      className="text-xs text-rose-600 hover:underline font-medium"
                    >
                      Remove Screenshot
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center py-2 space-y-1 hover:text-slate-900 transition-colors">
                    <Upload size={20} className="text-slate-400" />
                    <span className="text-xs text-slate-600 font-medium">
                      {isUploading ? 'Processing...' : 'Upload Chart Screenshot'}
                    </span>
                    <span className="text-[10px] text-slate-400">PNG, JPG up to 2MB</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      ref={fileInputRef} 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploading(true);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setTempImage(reader.result as string);
                          setIsUploading(false);
                        };
                        reader.readAsDataURL(file);
                      }} 
                      disabled={isUploading} 
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Trading Confluence &amp; Notes</label>
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                placeholder="Market structure shift, liquidity sweep, key session highs/lows..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white min-h-[50px]" 
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 border-t border-slate-100 flex gap-2.5">
              <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isUploading || isSubmitting || (lotSize === 0 && !!warning)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Recording...' : 'Commit Position'}
              </button>
            </div>
          </form>
        )}

        {tempImage && (
          <ImageCropper 
            image={tempImage} 
            onCropComplete={(cropped) => {
              setImageUrl(cropped);
              setTempImage(null);
            }}
            onCancel={() => setTempImage(null)}
          />
        )}
      </div>
    </div>
  );
}
