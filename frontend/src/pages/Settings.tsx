import React, { useState } from 'react';
import { Settings as SettingsIcon, Database, RotateCcw, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Header } from '../components/Header';
import { api } from '../services/api';

export const Settings: React.FC = () => {
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleResetData = async () => {
    if (!confirm('Are you sure you want to reseed the database? This resets all sample rosters, leaves, and conflicts.')) {
      return;
    }

    try {
      setResetting(true);
      await api.post('/scenarios/reset');
      setMsg('Database successfully reseeded with 32 realistic employees, 15 brands, 4 pods, and calendars.');
    } catch (err: any) {
      alert('Failed to reset seed data');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="System Settings & Database Config"
        subtitle="Operational parameters, database connectivity, and scheduling algorithm configuration"
      />

      <div className="p-8 space-y-6 max-w-4xl">
        {msg && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between text-xs text-emerald-800 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{msg}</span>
            </div>
            <button onClick={() => setMsg(null)}>✕</button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Database & Deployment Environment</h3>
              <p className="text-xs text-slate-500">Relational SQLite engine with PostgreSQL dual-compatibility</p>
            </div>
            <Database className="w-4 h-4 text-slate-400" />
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
              <span className="text-slate-400 block font-semibold">Active Backend API</span>
              <span className="text-slate-900 font-mono font-bold">FastAPI v0.110.0 (Python 3.13)</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
              <span className="text-slate-400 block font-semibold">Database Engine</span>
              <span className="text-slate-900 font-mono font-bold">SQLAlchemy 2.0 (SQLite / Postgres)</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Deterministic Scheduling Rules</h3>
              <p className="text-xs text-slate-500">Configured hard and soft constraint weights</p>
            </div>
            <ShieldCheck className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <div>
                <span className="font-bold text-slate-800">Hard Constraint: Approved Leaves & Comp-Offs</span>
                <p className="text-slate-500 text-[11px]">Strict exclusion from work shift assignments</p>
              </div>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                Mandatory
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <div>
                <span className="font-bold text-slate-800">Hard Constraint: Overlapping Shifts Prevention</span>
                <p className="text-slate-500 text-[11px]">Max 1 working shift per employee per date</p>
              </div>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200">
                Mandatory
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200/80">
              <div>
                <span className="font-bold text-slate-800">Soft Constraint: Preferred Weekly Off</span>
                <p className="text-slate-500 text-[11px]">Respected unless mandatory brand coverage requires attendance</p>
              </div>
              <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-bold border border-indigo-200">
                Configurable
              </span>
            </div>
          </div>
        </div>

        {/* Reseed Data Action */}
        <div className="bg-white rounded-xl border border-rose-200 p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-rose-900">Reset & Reseed Sample Dataset</h3>
              <p className="text-xs text-rose-700">
                Re-populates the database with the pristine Datastraw assessment dataset (32 associates, 15 brands).
              </p>
            </div>
            <button
              onClick={handleResetData}
              disabled={resetting}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-all"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
              {resetting ? 'Resetting...' : 'Reseed Database'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
