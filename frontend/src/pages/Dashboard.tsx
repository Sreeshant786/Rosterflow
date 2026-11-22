import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  Boxes,
  Workflow,
  ShieldCheck,
  AlertTriangle,
  CalendarCheck2,
  History,
  ArrowRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Header } from '../components/Header';
import { api, DashboardData } from '../services/api';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get<DashboardData>('/analytics/dashboard');
      setData(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load dashboard analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-medium">Loading operations metrics...</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Operations Command Center"
        subtitle="Real-time multi-brand workforce coverage, operating calendars, and conflict monitoring"
        onRefresh={fetchDashboard}
        isRefreshing={loading}
        statusBadge={
          kpis?.critical_conflicts === 0
            ? { type: 'success', label: '100% Coverage Valid' }
            : { type: 'critical', label: `${kpis?.critical_conflicts} Critical Conflicts` }
        }
      />

      <div className="p-8 space-y-6">
        {/* Banner Alert if Critical Conflicts exist */}
        {kpis && kpis.critical_conflicts > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-900">
                  {kpis.critical_conflicts} Unresolved Coverage Conflict{kpis.critical_conflicts > 1 ? 's' : ''} Detected
                </h4>
                <p className="text-xs text-rose-700 mt-0.5">
                  Mandatory operational staffing requirements are unmet due to employee leaves or single-resource availability gaps.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/conflicts')}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              Resolve in Conflict Centre
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Primary KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Workforce</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">{kpis?.total_employees}</span>
              <span className="text-xs text-slate-500 ml-2">Active Associates</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1 font-medium">
              <span className="text-emerald-600 font-semibold">{kpis?.operational_pods} Operational Pods</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active D2C Brands</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">{kpis?.active_brands}</span>
              <span className="text-xs text-slate-500 ml-2">Managed Brands</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1 font-medium">
              <span>80% Single-Resource Dedicated</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Coverage</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">{kpis?.coverage_percentage}%</span>
              <span className="text-xs text-slate-500 ml-2">{kpis?.roster_month}</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1 font-medium">
              <span className="text-indigo-600 font-semibold">Status: {kpis?.roster_status}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Critical Conflicts</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">{kpis?.critical_conflicts}</span>
              <span className="text-xs text-slate-500 ml-2">Hard Violations</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1 font-medium">
              <span>{kpis?.warning_conflicts} Preference Warnings</span>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pod Staffing Distribution</h3>
                <p className="text-xs text-slate-500">Employees distributed across operational pods</p>
              </div>
              <Boxes className="w-4 h-4 text-slate-400" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.pod_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="members" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Brand Operating Calendar Models</h3>
                <p className="text-xs text-slate-500">Distribution of operational cadence across processes</p>
              </div>
              <Workflow className="w-4 h-4 text-slate-400" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.rule_distribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={45}
                    paddingAngle={4}
                  >
                    {data?.rule_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Upcoming Leaves & Recent Changelog Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Leaves */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Upcoming Planned Leaves & Comp-Offs</h3>
                <p className="text-xs text-slate-500">Approved leaves automatically handled by the scheduler</p>
              </div>
              <CalendarCheck2 className="w-4 h-4 text-slate-400" />
            </div>

            <div className="divide-y divide-slate-100">
              {data?.upcoming_leaves && data.upcoming_leaves.length > 0 ? (
                data.upcoming_leaves.map((leave) => (
                  <div key={leave.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">{leave.employee_name}</span>
                      <span className="text-[11px] text-slate-500">
                        {leave.start_date} to {leave.end_date} • {leave.leave_type.replace('_', ' ')}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        leave.approval_status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : leave.approval_status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {leave.approval_status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">No upcoming leaves scheduled.</div>
              )}
            </div>
          </div>

          {/* Roster Change Audit Log */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Roster Change History</h3>
                <p className="text-xs text-slate-500">Audited manual modifications and backup assignments</p>
              </div>
              <History className="w-4 h-4 text-slate-400" />
            </div>

            <div className="divide-y divide-slate-100">
              {data?.recent_changelogs && data.recent_changelogs.length > 0 ? (
                data.recent_changelogs.map((log) => (
                  <div key={log.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        {log.employee_name} ({log.changed_date})
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        by {log.changed_by}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-snug">{log.reason}</p>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                      <span className="line-through text-slate-400">{log.old_status}</span>
                      <span>→</span>
                      <span className="text-indigo-600">{log.new_status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">No manual changes recorded yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Launchpad to Core Flows */}
        <div className="bg-gradient-to-r from-navy-900 to-indigo-950 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-base font-bold">Interactive Hiring Assessment Scenario</h3>
              <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
                Demonstrate single-resource brand coverage failure, automatic conflict detection, backup recommendation, and manual resolution with changelog preservation.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/scenario')}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider shrink-0 transition-all shadow-sm"
          >
            Launch Scenario
          </button>
        </div>
      </div>
    </div>
  );
};
