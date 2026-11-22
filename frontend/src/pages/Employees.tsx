import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Building2,
  Workflow,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Header } from '../components/Header';
import { api, Employee, Pod, Brand, Process } from '../services/api';

export const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPod, setFilterPod] = useState('ALL');

  // Add Employee Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [empCode, setEmpCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [podId, setPodId] = useState<number | ''>('');
  const [designation, setDesignation] = useState('Operations Associate');
  const [prefOff, setPrefOff] = useState<number>(6); // Sunday

  // Assign Brand / Process Modal State
  const [assigningEmp, setAssigningEmp] = useState<Employee | null>(null);
  const [assignBrandId, setAssignBrandId] = useState<number | ''>('');
  const [assignProcessId, setAssignProcessId] = useState<number | ''>('');

  // Change employee pod modal state
  const [changingPodEmp, setChangingPodEmp] = useState<Employee | null>(null);
  const [newPodId, setNewPodId] = useState<number | ''>('');

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eRes, pRes, bRes, prRes] = await Promise.all([
        api.get<Employee[]>('/employees'),
        api.get<Pod[]>('/pods'),
        api.get<Brand[]>('/brands'),
        api.get<Process[]>('/processes'),
      ]);
      setEmployees(eRes.data);
      setPods(pRes.data);
      setBrands(bRes.data);
      setProcesses(prRes.data);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: 'Failed to load employee directory' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empCode || !fullName || !email) {
      alert('Please fill out all required fields');
      return;
    }

    try {
      await api.post('/employees', {
        employee_code: empCode,
        full_name: fullName,
        email: email,
        pod_id: podId || null,
        designation: designation,
        active_status: true,
        joining_date: new Date().toISOString().split('T')[0],
        preferred_weekly_off: prefOff,
        max_consecutive_days: 6,
      });

      setShowAddModal(false);
      setEmpCode('');
      setFullName('');
      setEmail('');
      setFeedbackMsg({ type: 'success', text: `Employee ${fullName} added successfully.` });
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create employee');
    }
  };

  const handleCreateAssignment = async () => {
    if (!assigningEmp || !assignBrandId || !assignProcessId) return;

    try {
      await api.post('/assignments', {
        employee_id: assigningEmp.id,
        brand_id: assignBrandId,
        process_id: assignProcessId,
        assignment_status: 'active',
        is_primary: true,
      });

      setAssigningEmp(null);
      setAssignBrandId('');
      setAssignProcessId('');
      setFeedbackMsg({ type: 'success', text: 'Brand & Process assigned successfully.' });
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to assign brand and process');
    }
  };

  const handleUpdatePod = async () => {
    if (!changingPodEmp || newPodId === '') return;

    try {
      await api.put(`/employees/${changingPodEmp.id}`, { pod_id: newPodId });
      setFeedbackMsg({
        type: 'success',
        text: `${changingPodEmp.full_name} moved to ${pods.find((p) => p.id === newPodId)?.pod_name || 'the selected pod'}.`,
      });
      setChangingPodEmp(null);
      setNewPodId('');
      await fetchData();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to update employee pod.',
      });
    }
  };

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      search === '' ||
      emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.designation.toLowerCase().includes(search.toLowerCase());
    const matchesPod = filterPod === 'ALL' || (emp.pod_id && emp.pod_id.toString() === filterPod);
    return matchesSearch && matchesPod;
  });

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Employee Directory & Skills Mapping"
        subtitle="Manage 30+ operational associates, pod allocations, preferred rest days, and brand-process qualifications"
        onRefresh={fetchData}
        isRefreshing={loading}
      />

      <div className="p-8 space-y-6">
        {feedbackMsg && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-xs font-medium ${
              feedbackMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
              <span>{feedbackMsg.text}</span>
            </div>
            <button onClick={() => setFeedbackMsg(null)}>✕</button>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name, employee code, email, designation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 outline-hidden"
              />
            </div>

            <select
              value={filterPod}
              onChange={(e) => setFilterPod(e.target.value)}
              className="bg-slate-50 border border-slate-300 px-3 py-2 rounded-lg text-xs text-slate-700 outline-hidden"
            >
              <option value="ALL">All Operational Pods</option>
              {pods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.pod_name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Employee
          </button>
        </div>

        {/* Employee Directory Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Operational Pod</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Preferred Off</th>
                <th className="py-3 px-4">Assigned Brands & Processes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-600">{emp.employee_code}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{emp.full_name}</div>
                    <div className="text-[11px] text-slate-400">{emp.email}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 border border-slate-200">
                      {emp.pod_name || 'Unassigned'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">{emp.designation}</td>
                  <td className="py-3 px-4 text-slate-600 font-medium">
                    {dayNames[emp.preferred_weekly_off]}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1 max-w-sm">
                      {emp.assignments && emp.assignments.length > 0 ? (
                        emp.assignments.map((a) => (
                          <span
                            key={a.id}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
                          >
                            {a.brand_name} ({a.process_name.split(' ')[0]})
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">None assigned</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setChangingPodEmp(emp);
                          setNewPodId(emp.pod_id ?? '');
                        }}
                        className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded border border-emerald-200 transition-all"
                      >
                        Change Pod
                      </button>
                      <button
                        onClick={() => setAssigningEmp(emp)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded border border-indigo-200 transition-all"
                      >
                        Assign Brand
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add New Associate</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Employee Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="EMP033"
                    value={empCode}
                    onChange={(e) => setEmpCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Operational Pod</label>
                  <select
                    value={podId}
                    onChange={(e) => setPodId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
                  >
                    <option value="">Select Pod</option>
                    {pods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.pod_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Mahindra"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="name@datastraw.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Designation</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Preferred Weekly Off</label>
                <select
                  value={prefOff}
                  onChange={(e) => setPrefOff(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
                >
                  {dayNames.map((d, idx) => (
                    <option key={idx} value={idx}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Add Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Pod Modal */}
      {changingPodEmp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Change Operational Pod</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {changingPodEmp.full_name} ({changingPodEmp.employee_code})
                </p>
              </div>
              <button
                onClick={() => {
                  setChangingPodEmp(null);
                  setNewPodId('');
                }}
                className="text-slate-400 hover:text-slate-700"
                aria-label="Close change pod dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-700 block">Select Operational Pod</label>
              <select
                value={newPodId}
                onChange={(e) => setNewPodId(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800"
              >
                <option value="">Select Pod</option>
                {pods.map((pod) => (
                  <option key={pod.id} value={pod.id}>
                    {pod.pod_name}{pod.id === changingPodEmp.pod_id ? ' (Current)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-slate-500">
                Saving will update this employee's pod membership and the member counts shown on the Pods page.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setChangingPodEmp(null);
                  setNewPodId('');
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdatePod}
                disabled={newPodId === '' || newPodId === changingPodEmp.pod_id}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Save Pod Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Brand Modal */}
      {assigningEmp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Assign Brand & Process to {assigningEmp.full_name}
              </h3>
              <button onClick={() => setAssigningEmp(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target D2C Brand</label>
                <select
                  value={assignBrandId}
                  onChange={(e) => setAssignBrandId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 font-medium"
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
                <label className="font-semibold text-slate-700 block mb-1">Operational Process</label>
                <select
                  value={assignProcessId}
                  onChange={(e) => setAssignProcessId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 font-medium"
                >
                  <option value="">Select Process</option>
                  {processes.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.process_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssigningEmp(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAssignment}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
