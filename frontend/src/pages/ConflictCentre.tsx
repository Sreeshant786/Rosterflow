import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Calendar,
  Building2,
  Workflow,
  UserCheck,
  ArrowRight,
  ShieldAlert,
  Search,
  Filter
} from 'lucide-react';
import { Header } from '../components/Header';
import { api, Conflict, ValidationSummary, Roster, RosterEntry } from '../services/api';

export const ConflictCentre: React.FC = () => {
  const navigate = useNavigate();
  const [validation, setValidation] = useState<ValidationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvingConflictId, setResolvingConflictId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchConflicts = async () => {
    try {
      setLoading(true);
      const res = await api.get<ValidationSummary>('/conflicts');
      setValidation(res.data);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to fetch conflicts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConflicts();
  }, []);

  // Quick 1-click assign backup from suggestion
  const handleAssignBackup = async (conflict: Conflict, backupEmployeeId: number, backupEmployeeName: string) => {
    try {
      setResolvingConflictId(conflict.id);
      setErrorMsg(null);
      setSuccessMsg(null);

      // Get latest roster id
      const rList = await api.get<Roster[]>('/rosters');
      const conflictDate = new Date(`${conflict.date}T00:00:00`);
      const roster = rList.data.find(
        (item) =>
          item.month === conflictDate.getMonth() + 1 &&
          item.year === conflictDate.getFullYear()
      );
      if (!roster) throw new Error(`No roster found for ${conflict.date}`);
      if (!conflict.brand_id || !conflict.process_id) {
        throw new Error('This conflict is missing its brand or process ID. Refresh the page and try again.');
      }

      // Assign the backup to the exact brand, process and date shown on this conflict.
      const response = await api.post('/scenarios/step3', {
        roster_id: roster.id,
        backup_employee_id: backupEmployeeId,
        target_date: conflict.date,
        brand_id: conflict.brand_id,
        process_id: conflict.process_id,
      });

      await fetchConflicts();
      if (response.data?.conflict_resolved) {
        setSuccessMsg(`Successfully assigned ${backupEmployeeName} to ${conflict.brand_name} — ${conflict.process_name}. Conflict resolved.`);
      } else {
        setErrorMsg(response.data?.message || 'Assignment was saved, but the conflict is still active. Review the roster and eligibility rules.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to assign backup');
    } finally {
      setResolvingConflictId(null);
    }
  };

  const conflicts = validation?.conflicts || [];

  const filteredConflicts = conflicts.filter((c) => {
    const matchesSeverity = selectedSeverity === 'ALL' || c.severity === selectedSeverity;
    const matchesSearch =
      searchQuery === '' ||
      c.brand_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.process_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.conflict_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.human_readable_explanation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Conflict & Compliance Centre"
        subtitle="Active schedule diagnostics, missing coverage detection, and backup resource recommendations"
        onRefresh={fetchConflicts}
        isRefreshing={loading}
        statusBadge={
          validation?.critical_count === 0
            ? { type: 'success', label: '0 Critical Conflicts' }
            : { type: 'critical', label: `${validation?.critical_count} Critical Conflicts` }
        }
      />

      <div className="p-8 space-y-6">
        {/* Success / Error Messages */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800">
              ✕
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between text-xs text-rose-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-800">
              ✕
            </button>
          </div>
        )}

        {/* Diagnostic KPI Strip */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div
            onClick={() => setSelectedSeverity('ALL')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              selectedSeverity === 'ALL' ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20' : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="text-xs font-semibold text-slate-500 uppercase">Total Violations</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{validation?.total_conflicts || 0}</div>
          </div>

          <div
            onClick={() => setSelectedSeverity('CRITICAL')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              selectedSeverity === 'CRITICAL' ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20' : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="text-xs font-semibold text-rose-600 uppercase flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              Critical (Blocks Publication)
            </div>
            <div className="text-2xl font-bold text-rose-700 mt-1">{validation?.critical_count || 0}</div>
          </div>

          <div
            onClick={() => setSelectedSeverity('WARNING')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              selectedSeverity === 'WARNING' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20' : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="text-xs font-semibold text-amber-600 uppercase flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Preference Warnings
            </div>
            <div className="text-2xl font-bold text-amber-700 mt-1">{validation?.warning_count || 0}</div>
          </div>

          <div
            onClick={() => setSelectedSeverity('INFO')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              selectedSeverity === 'INFO' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20' : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="text-xs font-semibold text-blue-600 uppercase flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Operational Info
            </div>
            <div className="text-2xl font-bold text-blue-700 mt-1">{validation?.info_count || 0}</div>
          </div>
        </div>

        {/* Search bar */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
          <input
            type="text"
            placeholder="Search by brand, process, explanation, or conflict type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-slate-800 outline-hidden"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-xs text-slate-400 hover:text-slate-600 mr-2">
              Clear
            </button>
          )}
        </div>

        {/* Conflicts List */}
        <div className="space-y-4">
          {filteredConflicts.length > 0 ? (
            filteredConflicts.map((c) => (
              <div
                key={c.id}
                className={`bg-white rounded-xl border p-5 shadow-xs transition-all ${
                  c.severity === 'CRITICAL'
                    ? 'border-rose-200 hover:border-rose-300'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        c.severity === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : c.severity === 'WARNING'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}
                    >
                      {c.severity}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-600">{c.conflict_type}</span>
                    <span className="text-[11px] text-slate-400">• {c.conflict_id}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{c.date}</span>
                    </div>
                    {c.brand_name && (
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-700">{c.brand_name}</span>
                      </div>
                    )}
                    {c.process_name && (
                      <div className="flex items-center gap-1">
                        <Workflow className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.process_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Problem Explanation
                      </span>
                      <p className="text-xs text-slate-800 font-medium mt-0.5 leading-relaxed">
                        {c.human_readable_explanation}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Recommended Resolution
                      </span>
                      <p className="text-xs text-indigo-700 font-medium mt-0.5 leading-relaxed">
                        {c.suggested_resolution}
                      </p>
                    </div>
                  </div>

                  {/* Staffing Deficit Meter */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 flex flex-col justify-center text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Staffing Deficit</span>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <span className="text-xl font-bold text-rose-600">{c.actual_staffing}</span>
                      <span className="text-xs text-slate-400">/</span>
                      <span className="text-xl font-bold text-slate-800">{c.expected_staffing}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5">Required minimum active staff</span>
                  </div>
                </div>

                {/* Suggested Backups Section */}
                {c.suggested_backups && c.suggested_backups.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1 mb-2">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                      Eligible Backup Resources ({c.suggested_backups.length} candidates found)
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {c.suggested_backups.map((backup) => (
                        <div
                          key={backup.employee_id}
                          className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <div className="font-bold text-slate-800">{backup.employee_name}</div>
                            <div className="text-[10px] text-slate-500">
                              {backup.pod_name} • Suitability: {backup.suitability_score}%
                            </div>
                            <div className="text-[10px] text-indigo-600 font-medium truncate max-w-[180px]">
                              {backup.recommendation_reason}
                            </div>
                          </div>

                          <button
                            onClick={() => handleAssignBackup(c, backup.employee_id, backup.employee_name)}
                            disabled={resolvingConflictId === c.id}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold uppercase tracking-wider shrink-0 transition-all shadow-xs disabled:opacity-50"
                          >
                            {resolvingConflictId === c.id ? 'Assigning...' : 'Assign'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">No Conflicts Matching Filters</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                All mandatory brand coverage constraints and employee availability rules are currently satisfied.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
