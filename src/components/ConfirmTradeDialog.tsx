import React, { useState, useEffect, useRef } from 'react';
import { Trade, Account } from '../types';
import ImageCropper from './ImageCropper';
import { calculatePipValue, isIndexOrCrypto, isCommodity } from '../services/forexService';
import { X, CheckCircle2, Upload, AlertCircle } from 'lucide-react';

interface ConfirmTradeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tradeId: string, updates: Partial<Trade>) => void;
  trade: Trade;
  account: Account;
}

export default function ConfirmTradeDialog({ isOpen, onClose, onConfirm, trade, account }: ConfirmTradeDialogProps) {
  const [exitPrice, setExitPrice] = useState('');
  const [additionalLoss, setAdditionalLoss] = useState('0');
  const [notes, setNotes] = useState(trade?.notes || '');
  const [calculatedPL, setCalculatedPL] = useState<number | null>(null);
  const [afterImageUrl, setAfterImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const calculatePL = async () => {
      if (!isOpen || !trade || !exitPrice) {
        setCalculatedPL(null);
        return;
      }

      const exit = parseFloat(exitPrice);
      const entry = trade.entryPrice;
      const lots = trade.lotSize || 0;
      const addLoss = parseFloat(additionalLoss) || 0;

      if (isNaN(exit)) {
        setCalculatedPL(null);
        return;
      }

      let pl = 0;
      const pairUpper = trade.pair.toUpperCase();

      if (isCommodity(pairUpper)) {
        if (pairUpper.includes('XAU') || pairUpper.includes('GOLD')) {
          pl = (exit - entry) * 100 * lots;
        } else if (pairUpper.includes('OIL') || pairUpper.includes('WTI') || pairUpper.includes('BRENT')) {
          pl = (exit - entry) * 1000 * lots;
        } else {
          pl = (exit - entry) * 5000 * lots;
        }
      } else if (isIndexOrCrypto(pairUpper)) {
        pl = (exit - entry) * lots;
      } else {
        const isJpy = pairUpper.includes('JPY');
        const pipSize = isJpy ? 0.01 : 0.0001;
        const pips = (exit - entry) / pipSize;
        const pipValuePerLot = await calculatePipValue(pairUpper, account.currency || 'USD');
        pl = pips * pipValuePerLot * lots;
      }

      if (trade.type === 'sell') {
        pl = -pl;
      }

      pl -= addLoss;
      setCalculatedPL(Math.round(pl * 100) / 100);
    };

    calculatePL();
  }, [exitPrice, additionalLoss, trade, isOpen, account.currency]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(trade.id, {
        exitPrice: parseFloat(exitPrice),
        additionalLoss: parseFloat(additionalLoss),
        profitLoss: calculatedPL || 0,
        notes,
        afterImageUrl,
        status: 'closed',
        closedAt: new Date().toISOString()
      });
      onClose();
    } catch (err: any) {
      console.error("Error confirming trade:", err);
      setError(err.message || "Failed to close trade.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5 my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Close Position &amp; Realize P&amp;L</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {trade.pair} · {trade.type.toUpperCase()} @ {trade.entryPrice}
            </p>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Exit / Fill Price *</label>
              <input 
                type="number" 
                step="any" 
                required
                value={exitPrice} 
                onChange={(e) => setExitPrice(e.target.value)} 
                placeholder={trade.takeProfit?.toString() || "1.0900"} 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Fees / Slippage ({account.currency})</label>
              <input 
                type="number" 
                step="any"
                value={additionalLoss} 
                onChange={(e) => setAdditionalLoss(e.target.value)} 
                placeholder="0" 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white" 
              />
            </div>
          </div>

          {/* Calculated Realized P&L Display Card */}
          <div className="p-4 bg-slate-950 rounded-xl text-center space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Net Calculated Profit / Loss
            </span>
            <div className={`text-2xl font-bold font-mono ${
              calculatedPL && calculatedPL >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {calculatedPL !== null 
                ? `${calculatedPL >= 0 ? '+' : ''}${new Intl.NumberFormat('en-US', { style: 'currency', currency: account.currency }).format(calculatedPL)}`
                : '--'}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Post-Trade Review &amp; Lessons</label>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="Did you follow the plan? Did emotions play a role?" 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white min-h-[55px]" 
            />
          </div>

          {/* After Screenshot Dropzone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Exit Chart Screenshot (Optional)</label>
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 text-center">
              {afterImageUrl ? (
                <div className="space-y-2">
                  <img src={afterImageUrl} alt="After Preview" className="max-h-32 mx-auto rounded-lg border border-slate-200" referrerPolicy="no-referrer" />
                  <button type="button" onClick={() => setAfterImageUrl('')} className="text-xs text-rose-600 hover:underline font-medium">
                    Remove
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center justify-center py-2 space-y-1 text-slate-500 hover:text-slate-800 transition-colors">
                  <Upload size={18} className="text-slate-400" />
                  <span className="text-xs font-medium">{isUploading ? 'Uploading...' : 'Upload Exit Screenshot'}</span>
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
              disabled={isUploading || isSubmitting}
              className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Confirming...' : 'Close & Record PnL'}
            </button>
          </div>
        </form>

        {tempImage && (
          <ImageCropper 
            image={tempImage} 
            onCropComplete={(cropped) => {
              setAfterImageUrl(cropped);
              setTempImage(null);
            }}
            onCancel={() => setTempImage(null)}
          />
        )}
      </div>
    </div>
  );
}
