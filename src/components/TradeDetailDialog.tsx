import React from 'react';
import { Trade } from '@/src/types';
import { X, ExternalLink, Calendar, TrendingUp, CheckCircle, Image as ImageIcon } from 'lucide-react';

interface TradeDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  trade: Trade | null;
}

export default function TradeDetailDialog({ isOpen, onClose, trade }: TradeDetailDialogProps) {
  if (!isOpen || !trade) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="w-full max-w-[640px] bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-mono text-slate-900">{trade.pair}</h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  trade.type === 'buy' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {trade.type}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-700">
                  {trade.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                <Calendar size={12} />
                <span>{new Date(trade.createdAt || Date.now()).toLocaleString()}</span>
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

        {/* Matrix of Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-sans font-medium text-slate-400 uppercase tracking-wider block">Entry</span>
            <span className="text-sm font-bold text-slate-900">{trade.entryPrice}</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-sans font-medium text-slate-400 uppercase tracking-wider block">Exit Fill</span>
            <span className="text-sm font-bold text-slate-900">{trade.exitPrice || 'Open'}</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-sans font-medium text-slate-400 uppercase tracking-wider block">Lot Size</span>
            <span className="text-sm font-bold text-slate-900">{trade.lotSize || '-'}</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-sans font-medium text-slate-400 uppercase tracking-wider block">Realized P&amp;L</span>
            <span className={`text-sm font-bold ${
              trade.profitLoss && trade.profitLoss >= 0 ? 'text-emerald-600' : trade.profitLoss ? 'text-rose-600' : 'text-slate-500'
            }`}>
              {trade.profitLoss !== undefined ? `${trade.profitLoss >= 0 ? '+' : ''}$${trade.profitLoss}` : 'Pending'}
            </span>
          </div>
        </div>

        {/* Strategy By & Notes */}
        <div className="space-y-3">
          {trade.analysisBy && trade.analysisBy !== 'None' && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Strategy Setup By:</span>
              <span className="font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                {trade.analysisBy}
              </span>
            </div>
          )}

          {trade.notes && (
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Trade Analysis &amp; Confluences
              </span>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {trade.notes}
              </p>
            </div>
          )}
        </div>

        {/* Screenshots Showcase (Before & After) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Before Screenshot */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <ImageIcon size={14} className="text-slate-400" />
              <span>Before Execution</span>
            </span>
            {trade.imageUrl ? (
              <div className="border border-slate-200 rounded-xl p-2 bg-slate-50/50 space-y-2">
                <img 
                  src={trade.imageUrl} 
                  alt={`${trade.pair} before execution`} 
                  className="w-full h-40 object-cover rounded-lg border border-slate-200" 
                  referrerPolicy="no-referrer"
                />
                <div className="text-right">
                  <a 
                    href={trade.imageUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[11px] font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
                  >
                    <span>Full Resolution</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400">
                No before execution screenshot
              </div>
            )}
          </div>

          {/* After Screenshot */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <ImageIcon size={14} className="text-slate-400" />
              <span>After Result</span>
            </span>
            {trade.afterImageUrl ? (
              <div className="border border-slate-200 rounded-xl p-2 bg-slate-50/50 space-y-2">
                <img 
                  src={trade.afterImageUrl} 
                  alt={`${trade.pair} after result`} 
                  className="w-full h-40 object-cover rounded-lg border border-slate-200" 
                  referrerPolicy="no-referrer"
                />
                <div className="text-right">
                  <a 
                    href={trade.afterImageUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[11px] font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
                  >
                    <span>Full Resolution</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400">
                No exit chart screenshot
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Close Review
          </button>
        </div>
      </div>
    </div>
  );
}
