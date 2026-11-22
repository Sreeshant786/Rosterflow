import React from 'react';
import { ShieldCheck, AlertCircle, RefreshCw, Download } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onExport?: () => void;
  statusBadge?: {
    type: 'success' | 'warning' | 'critical' | 'neutral';
    label: string;
  };
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onRefresh,
  isRefreshing = false,
  onExport,
  statusBadge,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 sticky top-0 z-10">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 font-medium">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {statusBadge && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              statusBadge.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : statusBadge.type === 'critical'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : statusBadge.type === 'warning'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {statusBadge.type === 'success' ? (
              <ShieldCheck className="w-3.5 h-3.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5" />
            )}
            <span>{statusBadge.label}</span>
          </div>
        )}

        {onExport && (
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}

        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs border border-indigo-200">
            OL
          </div>
          <div className="hidden md:block">
            <span className="text-xs font-bold block text-slate-800 leading-tight">Operations Lead</span>
            <span className="text-[10px] text-slate-500 font-medium">Datastraw HQ</span>
          </div>
        </div>
      </div>
    </header>
  );
};
