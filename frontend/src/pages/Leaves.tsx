import React, { useEffect, useState } from 'react';
import {
  CalendarCheck2,
  Plus,
  Check,
  X,
  AlertTriangle,
  Calendar,
  Sparkles,
  UserX
} from 'lucide-react';
import { Header } from '../components/Header';
import { api, LeaveRequest, Employee } from '../services/api';

export const Leaves: React.FC = () => {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Submit Leave Modal
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveEmpId, setLeaveEmpId] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveType, setLeaveType] = useState('PLANNED_LEAVE');
  const [leaveReason, setLeaveReason] = useState('');

  // Record Unavailability Modal
  const [showUnavailModal, setShowUnavailModal] = useState(false);
  const [unavailEmpId, setUnavailEmpId] = useState<number | ''>('');
  const [unavailDate, setUnavailDate] = useState('');
  const [unavailNote, setUnavailNote] = useState('');

  const [message, setMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [lRes, eRes, hRes] = await Promise.all([
        api.get<LeaveRequest[]>('/leaves'),
        api.get<Employee[]>('/employees'),
        api.get<any[]>('/holidays'),
      ]);
      setLeaves(lRes.data);
      setEmployees(eRes.data);
      setHolidays(hRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveEmpId || !startDate || !endDate) return;

    try {
      await api.post('/leaves', {
        employee_id: Number(leaveEmpId),
        start_date: startDate,
        end_date: endDate,
        leave_type: leaveType,
        approval_status: 'APPROVED',
        reason: leaveReason || 'Planned leave',
      });

      setShowLeaveModal(false);
      setMessage('Leave request created and approved. Impacts scheduler validation automatically.');
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit leave');
    }
  };

  const handleUpdateStatus = async (leaveId: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.put(`/leaves/${leaveId}`, {
        approval_status: status,
        reviewed_by: 'Operations Lead',
      });
      setMessage(`Leave request status marked as ${status}.`);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update leave status');
    }
  };

  const handleRecordUnavailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unavailEmpId || !unavailDate) return;

    try {
      await api.post('/availability', {
        employee_id: Number(unavailEmpId),
        date: unavailDate,
        availability_status: 'UNAVAILABLE',
        note: unavailNote || 'Emergency unavailability',
      });

      setShowUnavailModal(false);
      setMessage('Unavailability recorded. Any conflicting assignments will be flagged in Conflict Centre.');
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to record unavailability');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Leave & Availability Management"
        subtitle="Review planned leaves, compensatory offs, emergency unavailabilities, and public holiday calendars"
        onRefresh={fetchData}
        isRefreshing={loading}
      />

      <div className="p-8 space-y-6">
        {message && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between text-xs text-emerald-800 font-medium">
            <span>{message}</span>
            <button onClick={() => setMessage(null)}>✕</button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            Approved leaves and explicit unavailabilities are strict hard constraints in RosterFlow.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUnavailModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold transition-all"
            >
              <UserX className="w-3.5 h-3.5" />
              Mark Unavailable
            </button>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Submit Leave Request
            </button>
          </div>
        </div>

        {/* Leave Requests Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Workforce Leave Requests</h3>
            <span className="text-xs text-slate-400 font-medium">Showing {leaves.length} records</span>
          </div>

          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Start Date</th>
                <th className="py-3 px-4">End Date</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaves.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{l.employee_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{l.employee_code}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-700 font-medium">
                    {l.leave_type.replace('_', ' ')}
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">{l.start_date}</td>
                  <td className="py-3 px-4 text-slate-600 font-medium">{l.end_date}</td>
                  <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{l.reason || '-'}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        l.approval_status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : l.approval_status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {l.approval_status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {l.approval_status === 'PENDING' && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleUpdateStatus(l.id, 'APPROVED')}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(l.id, 'REJECTED')}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Public Holidays Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Configured Public Holidays</h3>
              <p className="text-xs text-slate-500">Brands with holiday-off calendars automatically close on these dates</p>
            </div>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {holidays.map((h) => (
              <div key={h.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-xs">
                <span className="font-bold text-slate-900 block">{h.holiday_name}</span>
                <span className="text-[11px] text-indigo-600 font-semibold">{h.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Submit Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Submit Planned Leave</h3>
              <button onClick={() => setShowLeaveModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLeave} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Associate *</label>
                <select
                  required
                  value={leaveEmpId}
                  onChange={(e) => setLeaveEmpId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 font-medium"
                >
                  <option value="">Select Employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} ({e.employee_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Leave Category</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 font-medium"
                >
                  <option value="PLANNED_LEAVE">Planned Annual Leave</option>
                  <option value="CASUAL_LEAVE">Casual Leave</option>
                  <option value="SICK_LEAVE">Medical Leave</option>
                  <option value="COMP_OFF">Compensatory Off</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reason</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Family wedding / medical appointment"
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Approve & Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Unavailability Modal */}
      {showUnavailModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Record Emergency Unavailability</h3>
              <button onClick={() => setShowUnavailModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordUnavailability} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Associate *</label>
                <select
                  required
                  value={unavailEmpId}
                  onChange={(e) => setUnavailEmpId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 font-medium"
                >
                  <option value="">Select Employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} ({e.employee_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={unavailDate}
                  onChange={(e) => setUnavailDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Note / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Unscheduled medical emergency"
                  value={unavailNote}
                  onChange={(e) => setUnavailNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUnavailModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Mark Unavailable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
