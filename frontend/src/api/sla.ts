import { apiRequest } from "./client";

export interface SLACaseItem {
  id: string;
  title: string;
  institution_name: string;
  institution_permanent_id: string;
  assigned_bureau: string;
  status: string;
  priority: string;
  received_date: string;
  expected_disposal_date: string;
  days_elapsed: number;
  days_remaining: number;
  is_overdue: boolean;
  is_approaching: boolean;
  is_escalated: boolean;
  assigned_officer_name?: string;
}

export interface SLATaskItem {
  id: string;
  title: string;
  institution_name: string;
  originating_bureau: string;
  status: string;
  priority: string;
  due_date: string;
  days_remaining: number;
  is_overdue: boolean;
  assigned_owner_name?: string;
}

export interface SLASummary {
  warning_threshold_days: number;
  escalation_threshold_days: number;
  total_overdue_cases: number;
  total_approaching_cases: number;
  total_overdue_tasks: number;
  total_escalated_cases: number;
  overdue_cases: SLACaseItem[];
  approaching_cases: SLACaseItem[];
  overdue_tasks: SLATaskItem[];
}

export async function getSLASummary(): Promise<SLASummary> {
  return apiRequest<SLASummary>("/sla/summary");
}

export async function triggerSLAEvaluation(): Promise<SLASummary> {
  return apiRequest<SLASummary>("/sla/evaluate", { method: "POST" });
}
