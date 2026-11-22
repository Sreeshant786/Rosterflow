import React, { useEffect, useState } from 'react';
import { Boxes, Users, UserCheck } from 'lucide-react';
import { Header } from '../components/Header';
import { api, Pod, Employee } from '../services/api';

export const Pods: React.FC = () => {
  const [pods, setPods] = useState<Pod[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pRes, eRes] = await Promise.all([
        api.get<Pod[]>('/pods'),
        api.get<Employee[]>('/employees'),
      ]);
      setPods(pRes.data);
      setEmployees(eRes.data);
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
        title="Operational Pods"
        subtitle="Manage 4 operational business pods, designated pod leads, and associate membership"
        onRefresh={fetchData}
        isRefreshing={loading}
      />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pods.map((pod) => {
            const members = employees.filter((e) => e.pod_id === pod.id);

            return (
              <div key={pod.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <Boxes className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{pod.pod_name}</h3>
                      <p className="text-xs text-slate-500">{pod.description}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {members.length} Members
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-slate-500 font-medium">Designated Pod Lead:</span>
                  </div>
                  <span className="font-bold text-slate-900">{pod.lead_name || 'Pending Lead'}</span>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Pod Associates ({members.length})
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {members.map((m) => (
                      <div
                        key={m.id}
                        className="p-2 rounded bg-white hover:bg-slate-50 border border-slate-100 flex items-center justify-between text-xs transition-colors"
                      >
                        <div>
                          <span className="font-semibold text-slate-800">{m.full_name}</span>
                          <span className="text-slate-400 font-mono text-[10px] ml-1.5">({m.employee_code})</span>
                        </div>
                        <span className="text-[11px] text-slate-500">{m.designation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
