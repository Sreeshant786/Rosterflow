import React, { useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  History,
  Building2,
  Users,
  Boxes
} from 'lucide-react';
import { Header } from '../components/Header';
import { api, Pod, Brand, Employee, RosterChangeLog, Roster } from '../services/api';

export const Reports: React.FC = () => {
  const [pods, setPods] = useState<Pod[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<RosterChangeLog[]>([]);
  const [latestRoster, setLatestRoster] = useState<Roster | null>(null);

  const [exportType, setExportType] = useState<'company' | 'pod' | 'brand' | 'employee'>('company');
  const [selectedPodId, setSelectedPodId] = useState<number | ''>('');
  const [selectedBrandId, setSelectedBrandId] = useState<number | ''>('');
  const [selectedEmpId, setSelectedEmpId] = useState<number | ''>('');

  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pRes, bRes, eRes, rRes] = await Promise.all([
        api.get<Pod[]>('/pods'),
        api.get<Brand[]>('/brands'),
        api.get<Employee[]>('/employees'),
        api.get<Roster[]>('/rosters'),
      ]);
      setPods(pRes.data);
      setBrands(bRes.data);
      setEmployees(eRes.data);

      if (rRes.data.length > 0) {
        setLatestRoster(rRes.data[0]);
        const logRes = await api.get<RosterChangeLog[]>(`/rosters/${rRes.data[0].id}/changelogs`);
        setLogs(logRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getExportUrl = (format: 'csv' | 'excel') => {
    const baseUrl = `http://127.0.0.1:8000/api/exports/${format}`;
    const params = new URLSearchParams();

    if (latestRoster) params.append('roster_id', latestRoster.id.toString());
    if (exportType === 'pod' && selectedPodId) params.append('pod_id', selectedPodId.toString());
    if (exportType === 'brand' && selectedBrandId) params.append('brand_id', selectedBrandId.toString());
    if (exportType === 'employee' && selectedEmpId) params.append('employee_id', selectedEmpId.toString());

    return `${baseUrl}?${params.toString()}`;
  };

  const handleDownload = (format: 'csv' | 'excel') => {
    const url = getExportUrl(format);
    window.open(url, '_blank');
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Reports, Exports & Operational Audit"
        subtitle="Export production rosters to CSV/Excel and inspect immutable schedule change history"
        onRefresh={fetchData}
        isRefreshing={loading}
      />

      <div className="p-8 space-y-6">
        {/* Export Configuration Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Configure Roster Export</h3>
            <p className="text-xs text-slate-500">
              Download complete workforce schedules formatted for payroll, ERP, or client reporting
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-semibold">
            <div
              onClick={() => setExportType('company')}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                exportType === 'company'
                  ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 text-indigo-900'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <FileSpreadsheet className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <div className="font-bold">Company-Wide</div>
                <div className="text-[10px] text-slate-500 font-normal">All pods & brands</div>
              </div>
            </div>

            <div
              onClick={() => setExportType('pod')}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                exportType === 'pod'
                  ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 text-indigo-900'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Boxes className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <div className="font-bold">Pod-Wise</div>
                <div className="text-[10px] text-slate-500 font-normal">Specific operational pod</div>
              </div>
            </div>

            <div
              onClick={() => setExportType('brand')}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                exportType === 'brand'
                  ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 text-indigo-900'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Building2 className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <div className="font-bold">Brand-Wise</div>
                <div className="text-[10px] text-slate-500 font-normal">Specific D2C brand</div>
              </div>
            </div>

            <div
              onClick={() => setExportType('employee')}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                exportType === 'employee'
                  ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 text-indigo-900'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Users className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <div className="font-bold">Employee-Wise</div>
                <div className="text-[10px] text-slate-500 font-normal">Single associate schedule</div>
              </div>
            </div>
          </div>

          {/* Conditional Dropdown Filter */}
          {exportType === 'pod' && (
            <div className="text-xs">
              <label className="font-semibold text-slate-700 block mb-1">Select Target Pod</label>
              <select
                value={selectedPodId}
                onChange={(e) => setSelectedPodId(Number(e.target.value))}
                className="w-full max-w-sm bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
              >
                <option value="">Select Pod</option>
                {pods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.pod_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {exportType === 'brand' && (
            <div className="text-xs">
              <label className="font-semibold text-slate-700 block mb-1">Select Target Brand</label>
              <select
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(Number(e.target.value))}
                className="w-full max-w-sm bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
              >
                <option value="">Select Brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.brand_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {exportType === 'employee' && (
            <div className="text-xs">
              <label className="font-semibold text-slate-700 block mb-1">Select Associate</label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(Number(e.target.value))}
                className="w-full max-w-sm bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
              >
                <option value="">Select Associate</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.employee_code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
            <button
              onClick={() => handleDownload('csv')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Download CSV Roster
            </button>
            <button
              onClick={() => handleDownload('excel')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Download Excel Workbook (.xlsx)
            </button>
          </div>
        </div>

        {/* Change History Audit Log Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Roster Change Audit Trail (RosterChangeLog)</h3>
              <p className="text-xs text-slate-500">Every manual shift override and backup reassignment is permanently logged</p>
            </div>
            <History className="w-4 h-4 text-slate-400" />
          </div>

          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Associate</th>
                <th className="py-3 px-4">Shift Date</th>
                <th className="py-3 px-4">Transition</th>
                <th className="py-3 px-4">Reason for Change</th>
                <th className="py-3 px-4">Changed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">{log.employee_name}</td>
                  <td className="py-3 px-4 font-semibold text-slate-700">{log.changed_date}</td>
                  <td className="py-3 px-4">
                    <span className="text-slate-400 line-through mr-1">{log.old_status}</span>
                    <span className="font-bold text-indigo-600">→ {log.new_status}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-sm truncate">{log.reason}</td>
                  <td className="py-3 px-4 font-semibold text-slate-700">{log.changed_by}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No manual changes logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
