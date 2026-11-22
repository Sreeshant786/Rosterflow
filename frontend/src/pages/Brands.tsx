import React, { useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  Sliders,
  Users,
  Clock,
  Calendar,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Header } from '../components/Header';
import { api, Brand, Process, OperatingRule } from '../services/api';

export const Brands: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Brand Modal
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandDesc, setNewBrandDesc] = useState('');

  // Configure Operating Rule Modal
  const [configuringBrand, setConfiguringBrand] = useState<Brand | null>(null);
  const [ruleProcessId, setRuleProcessId] = useState<number | ''>('');
  const [operatingType, setOperatingType] = useState('EVERYDAY');
  const [minStaff, setMinStaff] = useState<number>(1);
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('18:00');

  const [message, setMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bRes, prRes] = await Promise.all([
        api.get<Brand[]>('/brands'),
        api.get<Process[]>('/processes'),
      ]);
      setBrands(bRes.data);
      setProcesses(prRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;

    try {
      await api.post('/brands', {
        brand_name: newBrandName,
        description: newBrandDesc,
        active_status: true,
      });

      setShowAddBrandModal(false);
      setNewBrandName('');
      setNewBrandDesc('');
      setMessage('Brand added successfully.');
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create brand');
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configuringBrand || !ruleProcessId) return;

    try {
      await api.post('/operating-rules', {
        brand_id: configuringBrand.id,
        process_id: Number(ruleProcessId),
        operating_type: operatingType,
        sunday_off: operatingType === 'SUNDAYS_AND_HOLIDAYS_OFF',
        public_holiday_off: operatingType !== 'EVERYDAY',
        minimum_staff_required: Number(minStaff),
        applicable_days: operatingType === 'SUNDAYS_AND_HOLIDAYS_OFF' ? '0,1,2,3,4,5' : '0,1,2,3,4,5,6',
        shift_start: shiftStart,
        shift_end: shiftEnd,
      });

      setConfiguringBrand(null);
      setMessage(`Operating rule configured for ${configuringBrand.brand_name}.`);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update operating rule');
    }
  };

  const getRuleBadge = (type: string) => {
    switch (type) {
      case 'EVERYDAY':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'EVERYDAY_EXCEPT_HOLIDAYS':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'SUNDAYS_AND_HOLIDAYS_OFF':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="D2C Brands & Operating Calendars"
        subtitle="Manage brand portfolios, multi-process calendars, operating cadence, and minimum staffing constraints"
        onRefresh={fetchData}
        isRefreshing={loading}
      />

      <div className="p-8 space-y-6">
        {message && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between text-xs text-emerald-800 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{message}</span>
            </div>
            <button onClick={() => setMessage(null)}>✕</button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{brands.length}</strong> active brand portfolios (approx. 80% single-resource dedicated, 20% multi-resource)
          </div>
          <button
            onClick={() => setShowAddBrandModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Brand
          </button>
        </div>

        {/* Brands Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {brands.map((b) => (
            <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 hover:border-slate-300 transition-all">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{b.brand_name}</h3>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{b.description || 'D2C brand'}</p>
                </div>
                <button
                  onClick={() => {
                    setConfiguringBrand(b);
                    if (processes[0]) setRuleProcessId(processes[0].id);
                  }}
                  title="Configure Operating Rules"
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                >
                  <Sliders className="w-4 h-4" />
                </button>
              </div>

              {/* Operating Rules List */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Configured Operating Calendars
                </span>
                {b.operating_rules && b.operating_rules.length > 0 ? (
                  b.operating_rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="bg-slate-50 rounded-lg p-2.5 border border-slate-200/80 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>{rule.process_name}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getRuleBadge(rule.operating_type)}`}>
                          {rule.operating_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Staff: {rule.minimum_staff_required} min req.</span>
                        <span>{rule.shift_start} - {rule.shift_end}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-slate-400 italic py-1">No operating rules configured</div>
                )}
              </div>

              {/* Assigned Associates */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Assigned Associates ({b.assigned_employees?.length || 0})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {b.assigned_employees && b.assigned_employees.length > 0 ? (
                    b.assigned_employees.map((emp) => (
                      <span
                        key={emp.employee_id}
                        className="px-2 py-1 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        {emp.full_name} ({emp.process_name.split(' ')[0]})
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">No associates assigned</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Brand Modal */}
      {showAddBrandModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add New Brand Portfolio</h3>
              <button onClick={() => setShowAddBrandModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBrand} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Minimalist Skincare"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Category & Description</label>
                <textarea
                  rows={2}
                  placeholder="D2C Clean beauty & personal care"
                  value={newBrandDesc}
                  onChange={(e) => setNewBrandDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBrandModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Save Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Configure Operating Rule Modal */}
      {configuringBrand && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Configure Operating Calendar</h3>
                <p className="text-xs text-slate-500">{configuringBrand.brand_name}</p>
              </div>
              <button onClick={() => setConfiguringBrand(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Operational Process</label>
                <select
                  value={ruleProcessId}
                  onChange={(e) => setRuleProcessId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 font-medium"
                >
                  {processes.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.process_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Operating Calendar Type</label>
                <select
                  value={operatingType}
                  onChange={(e) => setOperatingType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 font-medium"
                >
                  <option value="EVERYDAY">EVERYDAY (Mon-Sun 365 Days, including Holidays)</option>
                  <option value="EVERYDAY_EXCEPT_HOLIDAYS">EVERYDAY EXCEPT HOLIDAYS (Closed on Public Holidays)</option>
                  <option value="SUNDAYS_AND_HOLIDAYS_OFF">SUNDAYS & HOLIDAYS OFF (Mon-Sat regular operations)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Minimum Staff Required</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={minStaff}
                  onChange={(e) => setMinStaff(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Shift Start</label>
                  <input
                    type="time"
                    value={shiftStart}
                    onChange={(e) => setShiftStart(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 font-medium"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Shift End</label>
                  <input
                    type="time"
                    value={shiftEnd}
                    onChange={(e) => setShiftEnd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 font-medium"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfiguringBrand(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Save Calendar Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
