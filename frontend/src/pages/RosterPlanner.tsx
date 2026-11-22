import React, { useEffect, useState, useMemo } from 'react';
import {
  CalendarDays,
  Filter,
  RefreshCw,
  Send,
  AlertCircle,
  CheckCircle2,
  X,
  Search,
  Sparkles,
  Info
} from 'lucide-react';
import { Header } from '../components/Header';
import { api, Roster, RosterEntry, Pod, Brand, Process, Employee, ValidationSummary } from '../services/api';

export const RosterPlanner: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<number>(11);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [currentRoster, setCurrentRoster] = useState<Roster | null>(null);
  const [entries, setEntries] = useState<RosterEntry[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Filter States
  const [searchEmployee, setSearchEmployee] = useState('');
  const [filterPod, setFilterPod] = useState<string>('ALL');
  const [filterBrand, setFilterBrand] = useState<string>('ALL');
  const [filterProcess, setFilterProcess] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Loading & Action states
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit Modal State
  const [editingEntry, setEditingEntry] = useState<RosterEntry | null>(null);
  const [editStatus, setEditStatus] = useState<string>('Working');
  const [editBrandId, setEditBrandId] = useState<number | undefined>(undefined);
  const [editProcessId, setEditProcessId] = useState<number | undefined>(undefined);
  const [editReason, setEditReason] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Publish Modal State
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishNotes, setPublishNotes] = useState('');

  // Initial Load
  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [pRes, bRes, prRes, eRes, rListRes] = await Promise.all([
        api.get<Pod[]>('/pods'),
        api.get<Brand[]>('/brands'),
        api.get<Process[]>('/processes'),
        api.get<Employee[]>('/employees'),
        api.get<Roster[]>('/rosters'),
      ]);

      setPods(pRes.data);
      setBrands(bRes.data);
      setProcesses(prRes.data);
      setEmployees(eRes.data);

      const existingRoster = rListRes.data.find(
        (r) => r.month === selectedMonth && r.year === selectedYear
      ) || rListRes.data[0];

      if (existingRoster) {
        setCurrentRoster(existingRoster);
        await loadEntries(existingRoster.id);
      } else {
        setCurrentRoster(null);
        setEntries([]);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to initialize roster data');
    } finally {
      setLoading(false);
    }
  };

  const loadEntries = async (rosterId: number) => {
    try {
      const [entriesRes, rosterRes] = await Promise.all([
        api.get<RosterEntry[]>(`/rosters/${rosterId}/entries`),
        api.get<Roster>(`/rosters/${rosterId}?validate=true`),
      ]);
      setEntries(entriesRes.data);
      setCurrentRoster(rosterRes.data);
    } catch (err: any) {
      setErrorMsg('Failed to load roster entries');
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  // Generate / Regenerate Roster
  const handleGenerateRoster = async () => {
    try {
      setGenerating(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await api.post<Roster>('/rosters/generate', {
        month: selectedMonth,
        year: selectedYear,
      });

      setCurrentRoster(res.data);
      await loadEntries(res.data.id);
      setSuccessMsg(`Roster for ${selectedMonth}/${selectedYear} generated successfully.`);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to generate roster');
    } finally {
      setGenerating(false);
    }
  };

  // Publish Roster
  const handlePublish = async () => {
    if (!currentRoster) return;
    try {
      setPublishing(true);
      setErrorMsg(null);
      const res = await api.post<Roster>(`/rosters/${currentRoster.id}/publish`, {
        published_by: 'Operations Lead',
        notes: publishNotes || 'Monthly operational roster validated and published.',
      });
      setCurrentRoster(res.data);
      setShowPublishModal(false);
      setSuccessMsg('Roster published successfully! Roster is now in Published state.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Publication blocked due to critical conflicts!');
    } finally {
      setPublishing(false);
    }
  };

  // Open Edit Modal for a cell
  const handleCellClick = (entry: RosterEntry) => {
    setEditingEntry(entry);
    setEditStatus(entry.status);
    setEditBrandId(entry.brand_id || undefined);
    setEditProcessId(entry.process_id || undefined);
    setEditReason(entry.notes || '');
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingEntry || !currentRoster) return;
    if (!editReason.trim()) {
      alert('Please enter a reason for this manual change for audit compliance.');
      return;
    }

    try {
      setIsSavingEdit(true);
      const res = await api.put<RosterEntry>(
        `/rosters/${currentRoster.id}/entries/${editingEntry.id}`,
        {
          status: editStatus,
          brand_id: editBrandId,
          process_id: editProcessId,
          reason: editReason,
          changed_by: 'Operations Lead',
        }
      );

      // Update local entries
      setEntries((prev) => prev.map((e) => (e.id === res.data.id ? res.data : e)));

      // Revalidate roster
      const valRes = await api.get<ValidationSummary>(`/rosters/${currentRoster.id}/validate`);
      setCurrentRoster((prev) => (prev ? { ...prev, validation: valRes.data } : null));

      setEditingEntry(null);
      setSuccessMsg(`Shift updated for ${res.data.employee_name}. Audit log preserved.`);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update roster entry');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Unique sorted dates in this month
  const dates = useMemo(() => {
    const set = new Set(entries.map((e) => e.work_date));
    return Array.from(set).sort();
  }, [entries]);

  // Group entries by employee id
  const employeeRows = useMemo(() => {
    let filteredEmployees = employees;

    if (searchEmployee.trim()) {
      const q = searchEmployee.toLowerCase();
      filteredEmployees = filteredEmployees.filter(
        (e) =>
          e.full_name.toLowerCase().includes(q) ||
          e.employee_code.toLowerCase().includes(q)
      );
    }

    if (filterPod !== 'ALL') {
      const pId = parseInt(filterPod);
      filteredEmployees = filteredEmployees.filter((e) => e.pod_id === pId);
    }

    const map = new Map<number, { employee: Employee; entries: Map<string, RosterEntry> }>();

    filteredEmployees.forEach((emp) => {
      map.set(emp.id, { employee: emp, entries: new Map() });
    });

    entries.forEach((entry) => {
      if (map.has(entry.employee_id)) {
        map.get(entry.employee_id)!.entries.set(entry.work_date, entry);
      }
    });

    // Filter by Brand / Process / Status if selected
    if (filterBrand !== 'ALL' || filterProcess !== 'ALL' || filterStatus !== 'ALL') {
      const filteredResult = [];
      for (const [_, row] of map.entries()) {
        let matches = false;
        for (const [_, entry] of row.entries.entries()) {
          const brandMatch = filterBrand === 'ALL' || (entry.brand_id && entry.brand_id.toString() === filterBrand);
          const procMatch = filterProcess === 'ALL' || (entry.process_id && entry.process_id.toString() === filterProcess);
          const statusMatch = filterStatus === 'ALL' || entry.status === filterStatus;
          if (brandMatch && procMatch && statusMatch) {
            matches = true;
            break;
          }
        }
        if (matches) filteredResult.push(row);
      }
      return filteredResult;
    }

    return Array.from(map.values());
  }, [employees, entries, searchEmployee, filterPod, filterBrand, filterProcess, filterStatus]);

  // Status Chip Style Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Working':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100';
      case 'Weekly Off':
        return 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200';
      case 'Public Holiday':
        return 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100';
      case 'Leave':
        return 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100';
      case 'Comp-Off':
        return 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100';
      case 'Unavailable':
        return 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100 font-bold';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusShortLabel = (entry: RosterEntry) => {
    switch (entry.status) {
      case 'Working':
        return entry.brand_name ? entry.brand_name.split(' ')[0] : 'Work';
      case 'Weekly Off':
        return 'OFF';
      case 'Public Holiday':
        return 'HOL';
      case 'Leave':
        return 'LEAVE';
      case 'Comp-Off':
        return 'COMP';
      case 'Unavailable':
        return 'UNAVL';
      default:
        return entry.status;
    }
  };

  const validation = currentRoster?.validation;
  const criticalCount = validation?.critical_count || 0;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Roster Planner & Schedule Matrix"
        subtitle={`Interactive operational calendar for ${selectedMonth}/${selectedYear} with automated coverage validation`}
        onRefresh={() => currentRoster && loadEntries(currentRoster.id)}
        isRefreshing={loading}
        statusBadge={
          currentRoster?.status === 'Published'
            ? { type: 'success', label: 'Published' }
            : criticalCount > 0
            ? { type: 'critical', label: `${criticalCount} Critical Violations` }
            : { type: 'warning', label: 'Draft Validated' }
        }
      />

      <div className="p-8 space-y-6">
        {/* Messages */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between text-xs text-rose-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Toolbar & Filters */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          {/* Month / Year controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-slate-800 px-2 py-1 outline-hidden"
              >
                <option value={10}>October 2026</option>
                <option value={11}>November 2026</option>
                <option value={12}>December 2026</option>
              </select>
            </div>

            <button
              onClick={handleGenerateRoster}
              disabled={generating}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-all"
            >
              <Sparkles className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              {currentRoster ? 'Regenerate Draft' : 'Generate Roster'}
            </button>

            {currentRoster && currentRoster.status !== 'Published' && (
              <button
                onClick={() => setShowPublishModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                Publish Roster
              </button>
            )}
          </div>

          {/* Quick Stats Summary */}
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Status:</span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] ${
                  currentRoster?.status === 'Published'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {currentRoster?.status || 'None'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Total Entries:</span>
              <span className="text-slate-900 font-bold">{entries.length}</span>
            </div>
            {validation && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Critical Conflicts:</span>
                <span
                  className={`font-bold ${
                    criticalCount > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {criticalCount}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search employee by name or code..."
              value={searchEmployee}
              onChange={(e) => setSearchEmployee(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={filterPod}
              onChange={(e) => setFilterPod(e.target.value)}
              className="bg-white border border-slate-300 px-2 py-1.5 rounded-lg text-xs text-slate-700 outline-hidden"
            >
              <option value="ALL">All Pods</option>
              {pods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.pod_name}
                </option>
              ))}
            </select>

            <select
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="bg-white border border-slate-300 px-2 py-1.5 rounded-lg text-xs text-slate-700 outline-hidden max-w-[150px]"
            >
              <option value="ALL">All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.brand_name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white border border-slate-300 px-2 py-1.5 rounded-lg text-xs text-slate-700 outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="Working">Working</option>
              <option value="Weekly Off">Weekly Off</option>
              <option value="Public Holiday">Public Holiday</option>
              <option value="Leave">Leave</option>
              <option value="Comp-Off">Comp-Off</option>
              <option value="Unavailable">Unavailable</option>
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center flex-wrap gap-4 text-[11px] font-medium text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
          <span className="font-semibold text-slate-900">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-emerald-100 border border-emerald-300"></span>
            <span>Working</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-slate-100 border border-slate-300"></span>
            <span>Weekly Off</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-purple-100 border border-purple-300"></span>
            <span>Public Holiday</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-amber-100 border border-amber-300"></span>
            <span>Planned Leave</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-teal-100 border border-teal-300"></span>
            <span>Comp-Off</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-rose-100 border border-rose-300"></span>
            <span>Unavailable</span>
          </div>
          <span className="text-slate-400 ml-auto italic">Click any cell to inspect or manually edit shift</span>
        </div>

        {/* Dense Schedule Grid Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700">
                  <th className="py-3 px-3 sticky left-0 bg-slate-100 z-10 w-44 font-bold border-r border-slate-200">
                    Employee
                  </th>
                  <th className="py-3 px-2 w-24 font-bold border-r border-slate-200 text-slate-500">
                    Pod
                  </th>
                  {dates.map((dStr) => {
                    const dateObj = new Date(dStr);
                    const dayNum = dateObj.getDate();
                    const dayShort = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                    const isWeekend = dateObj.getDay() === 0;

                    return (
                      <th
                        key={dStr}
                        className={`py-2 px-1 text-center min-w-[52px] border-r border-slate-200 font-semibold ${
                          isWeekend ? 'bg-indigo-50/50 text-indigo-900' : ''
                        }`}
                      >
                        <div className="text-[10px] uppercase font-bold text-slate-500">{dayShort}</div>
                        <div className="text-xs font-bold text-slate-800">{dayNum}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employeeRows.length > 0 ? (
                  employeeRows.map(({ employee, entries: empEntries }) => (
                    <tr key={employee.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 sticky left-0 bg-white hover:bg-slate-50 z-10 border-r border-slate-200">
                        <div className="font-bold text-slate-900 truncate">{employee.full_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{employee.employee_code}</div>
                      </td>
                      <td className="py-2 px-2 border-r border-slate-200 text-[11px] text-slate-500 truncate">
                        {employee.pod_name?.replace(' Pod', '') || '-'}
                      </td>
                      {dates.map((dStr) => {
                        const entry = empEntries.get(dStr);
                        if (!entry) {
                          return (
                            <td key={dStr} className="py-1 px-1 border-r border-slate-100 text-center text-slate-300">
                              -
                            </td>
                          );
                        }

                        return (
                          <td
                            key={dStr}
                            onClick={() => handleCellClick(entry)}
                            className="py-1 px-1 border-r border-slate-100 text-center cursor-pointer"
                          >
                            <div
                              title={`${entry.employee_name} on ${dStr}\nStatus: ${entry.status}\nBrand: ${entry.brand_name || 'None'}\nProcess: ${entry.process_name || 'None'}\nNotes: ${entry.notes || 'None'}`}
                              className={`py-1 px-1 rounded text-[10px] font-semibold border truncate transition-all ${getStatusBadge(
                                entry.status
                              )}`}
                            >
                              {getStatusShortLabel(entry)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={dates.length + 2} className="py-12 text-center text-slate-400">
                      No roster entries match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Shift Modal */}
      {editingEntry && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Modify Shift Assignment</h3>
                <p className="text-xs text-slate-500">
                  {editingEntry.employee_name} ({editingEntry.employee_code}) • {editingEntry.work_date}
                </p>
              </div>
              <button
                onClick={() => setEditingEntry(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Shift Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 outline-hidden font-medium"
                >
                  <option value="Working">Working (Active Shift)</option>
                  <option value="Weekly Off">Weekly Off</option>
                  <option value="Public Holiday">Public Holiday</option>
                  <option value="Leave">Planned Leave</option>
                  <option value="Comp-Off">Comp-Off</option>
                  <option value="Unavailable">Unavailable</option>
                </select>
              </div>

              {editStatus === 'Working' && (
                <>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Assigned Brand</label>
                    <select
                      value={editBrandId || ''}
                      onChange={(e) => setEditBrandId(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 outline-hidden font-medium"
                    >
                      <option value="">Select Brand</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.brand_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Assigned Process</label>
                    <select
                      value={editProcessId || ''}
                      onChange={(e) => setEditProcessId(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 outline-hidden font-medium"
                    >
                      <option value="">Select Process</option>
                      {processes.map((pr) => (
                        <option key={pr.id} value={pr.id}>
                          {pr.process_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Reason for Manual Change <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Required for audit changelog (e.g. Assigned as qualified backup resource)"
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 outline-hidden"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingEntry(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {isSavingEdit ? 'Saving...' : 'Apply & Revalidate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Confirmation Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Publish Monthly Roster</h3>
              </div>
              <button
                onClick={() => setShowPublishModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {criticalCount > 0 ? (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-rose-900">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  Publication Blocked: {criticalCount} Critical Violations
                </div>
                <p>
                  System rules prevent publication of rosters with unresolved mandatory coverage gaps or employee schedule violations.
                </p>
                <p className="font-medium text-rose-900">
                  Please resolve all critical conflicts in the Conflict Centre before publishing.
                </p>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  All Mandatory Coverage Verified
                </div>
                <p>
                  100% of brand-process operating calendars have met their staffing requirements.
                </p>
              </div>
            )}

            <div className="text-xs">
              <label className="font-semibold text-slate-700 block mb-1">Publication Notes</label>
              <textarea
                value={publishNotes}
                onChange={(e) => setPublishNotes(e.target.value)}
                placeholder="Optional release comments for pod leads and brand managers"
                rows={2}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 outline-hidden"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={publishing || criticalCount > 0}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {publishing ? 'Publishing...' : 'Confirm & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
