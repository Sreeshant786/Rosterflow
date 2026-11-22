import React, { useEffect, useState } from 'react';
import { Workflow, Users, CheckCircle2 } from 'lucide-react';
import { Header } from '../components/Header';
import { api, Process } from '../services/api';

export const Processes: React.FC = () => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get<Process[]>('/processes');
      setProcesses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Operational Processes"
        subtitle="Core workflow verticals: Customer Support (CS), Abandoned Cart (ACC), Retention, NDR, and Operations"
        onRefresh={fetchData}
        isRefreshing={loading}
      />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {processes.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Workflow className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {p.assigned_employee_count} Mapped Staff
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">{p.process_name}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{p.description}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Deterministic coverage rules active</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
