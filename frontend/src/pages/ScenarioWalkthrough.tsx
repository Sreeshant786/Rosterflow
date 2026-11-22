import React, { useState, useEffect } from 'react';
import {
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  UserCheck,
  Building2,
  Calendar,
  History,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { Header } from '../components/Header';
import { api, Roster, Conflict, BackupSuggestion } from '../services/api';

export const ScenarioWalkthrough: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [rosterId, setRosterId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [stepData, setStepData] = useState<any>(null);
  const [detectedConflicts, setDetectedConflicts] = useState<Conflict[]>([]);
  const [selectedBackupId, setSelectedBackupId] = useState<number | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  // Initialize Step 1 automatically on page open
  useEffect(() => {
    executeStep1();
  }, []);

  // STEP 1: Generate Baseline Roster
  const executeStep1 = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const res = await api.post('/scenarios/step1', { month: 11, year: 2026 });
      setRosterId(res.data.roster_id);
      setStepData(res.data);
      setCurrentStep(1);
      setMessage('Baseline monthly roster successfully generated.');
      await fetchAuditLogs(res.data.roster_id);
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to generate baseline roster');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Invalidate Single-Resource Brand (Arjun Patel / Kalyan Organics)
  const executeStep2 = async () => {
    if (!rosterId) return;
    try {
      setLoading(true);
      setMessage(null);
      const res = await api.post('/scenarios/step2', {
        roster_id: rosterId,
        target_date: '2026-11-14',
      });
      setStepData(res.data);
      setDetectedConflicts(res.data.detected_conflicts || []);
      if (res.data.detected_conflicts?.[0]?.suggested_backups?.length > 0) {
        setSelectedBackupId(res.data.detected_conflicts[0].suggested_backups[0].employee_id);
      }
      setCurrentStep(2);
      setMessage(res.data.message);
      await fetchAuditLogs(rosterId);
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to execute Step 2');
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Assign Backup & Resolve Conflict
  const executeStep3 = async () => {
    if (!rosterId || !selectedBackupId) {
      alert('Please select a backup employee to assign.');
      return;
    }
    try {
      setLoading(true);
      setMessage(null);
      const res = await api.post('/scenarios/step3', {
        roster_id: rosterId,
        backup_employee_id: selectedBackupId,
        target_date: '2026-11-14',
      });
      setStepData(res.data);
      setCurrentStep(3);
      setMessage(res.data.message);
      await fetchAuditLogs(rosterId);
    } catch (err: any) {
      setMessage(err.response?.data?.detail || 'Failed to execute Step 3');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async (rId: number) => {
    try {
      const res = await api.get(`/rosters/${rId}/changelogs`);
      setAuditLogs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReset = async () => {
    try {
      setLoading(true);
      await api.post('/scenarios/reset');
      await executeStep1();
    } catch (err: any) {
      alert('Failed to reset demo dataset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Interactive Hiring Assessment Scenario"
        subtitle="End-to-end verification of single-resource brand coverage failure, conflict detection, backup assignment, and audit log tracking"
        onRefresh={handleReset}
        isRefreshing={loading}
        statusBadge={{ type: 'neutral', label: 'Assessment Mode' }}
      />

      <div className="p-8 space-y-6 max-w-5xl mx-auto w-full">
        {/* Scenario Overview Box */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">
                Datastraw Hiring Assessment Scenario
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                Single-Resource Brand Unavailability & Backup Resolution Flow
              </h3>
            </div>
            <button
              onClick={handleReset}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Demonstration
            </button>
          </div>

          {/* Stepper Header */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div
              className={`p-3 rounded-lg border flex items-center gap-3 transition-all ${
                currentStep >= 1 ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-600'
                }`}
              >
                1
              </div>
              <div>
                <div className="text-xs font-bold">Baseline Schedule</div>
                <div className="text-[10px] text-slate-500">Generate monthly roster</div>
              </div>
            </div>

            <div
              className={`p-3 rounded-lg border flex items-center gap-3 transition-all ${
                currentStep >= 2 ? 'bg-rose-50/70 border-rose-200 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep >= 2 ? 'bg-rose-600 text-white' : 'bg-slate-300 text-slate-600'
                }`}
              >
                2
              </div>
              <div>
                <div className="text-xs font-bold">Inject Unavailability</div>
                <div className="text-[10px] text-slate-500">Detect missing coverage</div>
              </div>
            </div>

            <div
              className={`p-3 rounded-lg border flex items-center gap-3 transition-all ${
                currentStep >= 3 ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep >= 3 ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'
                }`}
              >
                3
              </div>
              <div>
                <div className="text-xs font-bold">Deploy Backup</div>
                <div className="text-[10px] text-slate-500">Resolve & audit change</div>
              </div>
            </div>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-medium ${
              currentStep === 2
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : currentStep === 3
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-indigo-50 border-indigo-200 text-indigo-800'
            }`}
          >
            {currentStep === 2 ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : currentStep === 3 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
            )}
            <span>{message}</span>
          </div>
        )}

        {/* Dynamic Step Content */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h4 className="text-sm font-bold text-slate-900">Step 1: Baseline Roster Verification</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              In this scenario, <strong>Kalyan Organics</strong> is an active brand configured with a 365-day Everyday operating calendar.
              Associate <strong>Arjun Patel (EMP005)</strong> is the sole dedicated resource handling Customer Support for this brand.
            </p>

            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200/80 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">Target Brand</span>
                <span className="text-slate-900 font-bold text-sm">Kalyan Organics</span>
                <span className="text-slate-500 block text-[11px]">80% Single-resource brand</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Dedicated Associate</span>
                <span className="text-slate-900 font-bold text-sm">Arjun Patel (EMP005)</span>
                <span className="text-slate-500 block text-[11px]">Alpha Pod • Senior Operations</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={executeStep2}
                disabled={loading}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
              >
                <span>Trigger Unavailability on 14 Nov 2026</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="bg-white rounded-xl border border-rose-200 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-rose-900">
                  Step 2: Emergency Unavailability Injected & Conflict Detected
                </h4>
                <p className="text-xs text-rose-700 mt-0.5">
                  Arjun Patel was marked UNAVAILABLE on 14 Nov 2026. The validation service immediately caught the missing coverage!
                </p>
              </div>
              <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded text-xs font-bold">
                CRITICAL CONFLICT
              </span>
            </div>

            {/* Conflict Diagnostic Card */}
            {detectedConflicts.map((c) => (
              <div key={c.id} className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 space-y-3">
                <div className="text-xs text-rose-900 font-medium">
                  <strong>Conflict Diagnostic:</strong> {c.human_readable_explanation}
                </div>
                <div className="text-xs text-indigo-900 font-medium bg-white/80 p-2.5 rounded-lg border border-indigo-100">
                  <strong>Recommended Resolution:</strong> {c.suggested_resolution}
                </div>

                {/* Candidate Backups Selection */}
                {c.suggested_backups && c.suggested_backups.length > 0 && (
                  <div className="mt-3">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                      Select Qualified Backup Resource:
                    </span>
                    <div className="space-y-2">
                      {c.suggested_backups.map((backup) => (
                        <label
                          key={backup.employee_id}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedBackupId === backup.employee_id
                              ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-500/20'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="backup"
                              checked={selectedBackupId === backup.employee_id}
                              onChange={() => setSelectedBackupId(backup.employee_id)}
                              className="text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-900">{backup.employee_name}</div>
                              <div className="text-[10px] text-slate-500">
                                {backup.pod_name} • {backup.recommendation_reason}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {backup.suitability_score}% Suitability
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={executeStep3}
                disabled={loading || !selectedBackupId}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
              >
                <span>Deploy Selected Backup</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="bg-white rounded-xl border border-emerald-200 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-emerald-900">
                  Step 3: Backup Deployed & Conflict Successfully Resolved
                </h4>
                <p className="text-xs text-emerald-700 mt-0.5">
                  The backup resource was assigned to Kalyan Organics. Revalidation confirmed zero coverage deficit on that date!
                </p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-xs font-bold">
                CONFLICT RESOLVED
              </span>
            </div>

            <div className="bg-emerald-50/60 rounded-xl p-4 border border-emerald-200 text-xs text-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Verification Results:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                <li>Arjun Patel (EMP005) marked UNAVAILABLE for medical emergency.</li>
                <li>Backup Associate manually assigned to cover Customer Support.</li>
                <li>Roster revalidated: 0 critical coverage gaps remain for Kalyan Organics on 14 Nov 2026.</li>
                <li>Roster change history recorded in the database audit table.</li>
              </ul>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold"
              >
                Restart Demonstration
              </button>
              <button
                onClick={() => window.location.href = '/roster'}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                View Roster Calendar
              </button>
            </div>
          </div>
        )}

        {/* Change History Audit Trail */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Database Audit Trail (RosterChangeLog)</h4>
              <p className="text-xs text-slate-500">Immutable record of manual shifts and emergency overrides</p>
            </div>
            <History className="w-4 h-4 text-slate-400" />
          </div>

          <div className="divide-y divide-slate-100">
            {auditLogs && auditLogs.length > 0 ? (
              auditLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="py-2.5 flex items-start justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{log.employee_name}</span>
                    <span className="text-slate-400 ml-2 font-mono text-[11px]">{log.changed_date}</span>
                    <p className="text-[11px] text-slate-600 mt-0.5">{log.reason}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block font-semibold">{log.changed_by}</span>
                    <span className="text-[11px] font-bold text-indigo-600">
                      {log.old_status} → {log.new_status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">No audit log entries recorded yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
