import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Employee {
  id: number;
  employee_code: string;
  full_name: string;
  email: string;
  pod_id: number | null;
  pod_name: string | null;
  designation: string;
  active_status: boolean;
  joining_date: string;
  preferred_weekly_off: number;
  max_consecutive_days: number;
  assignments: {
    id: number;
    brand_id: number;
    brand_name: string;
    process_id: number;
    process_name: string;
    is_primary: boolean;
  }[];
}

export interface Pod {
  id: number;
  pod_name: string;
  pod_lead_id: number | null;
  lead_name: string | null;
  member_count: number;
  description: string | null;
}

export interface Brand {
  id: number;
  brand_name: string;
  description: string | null;
  active_status: boolean;
  assigned_employees: {
    employee_id: number;
    employee_code: string;
    full_name: string;
    process_id: number;
    process_name: string;
    is_primary: boolean;
  }[];
  operating_rules: OperatingRule[];
}

export interface Process {
  id: number;
  process_name: string;
  description: string | null;
  assigned_employee_count: number;
}

export interface OperatingRule {
  id: number;
  brand_id: number;
  brand_name?: string;
  process_id: number;
  process_name?: string;
  operating_type: string;
  sunday_off: boolean;
  public_holiday_off: boolean;
  minimum_staff_required: number;
  applicable_days: string;
  shift_start: string;
  shift_end: string;
}

export interface LeaveRequest {
  id: number;
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  approval_status: string;
  reason?: string;
  reviewed_by?: string;
}

export interface BackupSuggestion {
  employee_id: number;
  employee_code: string;
  employee_name: string;
  pod_name?: string;
  assigned_brands: string[];
  assigned_processes: string[];
  current_shift_status?: string;
  suitability_score: number;
  recommendation_reason: string;
}

export interface Conflict {
  id: string;
  conflict_id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  conflict_type: string;
  date: string;
  brand_id?: number;
  brand_name?: string;
  process_id?: number;
  process_name?: string;
  affected_employee_id?: number;
  affected_employee_name?: string;
  expected_staffing: number;
  actual_staffing: number;
  human_readable_explanation: string;
  suggested_resolution: string;
  suggested_backups: BackupSuggestion[];
}

export interface ValidationSummary {
  total_conflicts: number;
  critical_count: number;
  warning_count: number;
  info_count: number;
  is_valid_for_publication: boolean;
  conflicts: Conflict[];
}

export interface Roster {
  id: number;
  month: number;
  year: number;
  status: 'Draft' | 'Pending Approval' | 'Published';
  generated_at: string;
  published_at?: string;
  published_by?: string;
  notes?: string;
  total_entries: number;
  validation?: ValidationSummary;
}

export interface RosterEntry {
  id: number;
  roster_id: number;
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
  pod_id?: number;
  pod_name?: string;
  brand_id?: number;
  brand_name?: string;
  process_id?: number;
  process_name?: string;
  work_date: string;
  status: 'Working' | 'Weekly Off' | 'Public Holiday' | 'Leave' | 'Comp-Off' | 'Unavailable';
  shift_start?: string;
  shift_end?: string;
  notes?: string;
}

export interface RosterChangeLog {
  id: number;
  roster_id: number;
  employee_id: number;
  employee_name?: string;
  changed_date: string;
  old_status?: string;
  new_status: string;
  old_brand_name?: string;
  new_brand_name?: string;
  old_process_name?: string;
  new_process_name?: string;
  reason: string;
  changed_by: string;
  created_at: string;
}

export interface DashboardData {
  kpis: {
    total_employees: number;
    active_brands: number;
    operational_pods: number;
    total_processes: number;
    roster_status: string;
    roster_month: string;
    roster_id: number | null;
    coverage_percentage: number;
    critical_conflicts: number;
    warning_conflicts: number;
  };
  upcoming_leaves: {
    id: number;
    employee_name: string;
    leave_type: string;
    start_date: string;
    end_date: string;
    approval_status: string;
  }[];
  recent_changelogs: {
    id: number;
    employee_name: string;
    changed_date: string;
    old_status: string;
    new_status: string;
    reason: string;
    changed_by: string;
    created_at: string;
  }[];
  pod_distribution: { name: string; members: number }[];
  rule_distribution: { name: string; value: number; color: string }[];
}
