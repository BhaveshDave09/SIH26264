import { apiRequest } from "./client";

export interface WorkloadItem {
  bureau: string;
  total_cases: number;
  pending_cases: number;
  disposed_cases: number;
  overdue_cases: number;
}

export interface TrendItem {
  month: string;
  received_count: number;
  disposed_count: number;
}

export interface AgeingBucket {
  bucket: string;
  count: number;
}

export interface CategoryBreakdown {
  category: string;
  count: number;
}

export interface RecentActionItem {
  id: number;
  case_id: string;
  actor: string;
  action_type: string;
  remarks: string;
  timestamp: string;
}

export interface HighPriorityItem {
  id: string;
  title: string;
  institution_name: string;
  priority: string;
  status: string;
  assigned_bureau: string;
  is_overdue: boolean;
  has_overlap_alert: boolean;
}

export interface DashboardStats {
  total_cases: number;
  pending_cases: number;
  under_process_cases: number;
  disposed_cases: number;
  transferred_cases: number;
  overdue_cases: number;
  approaching_deadline_cases: number;
  open_coordination_alerts: number;
  active_coordination_tasks: number;
  coordination_health_score: number;
  coordination_health_explanation: string;
  bureau_workload: WorkloadItem[];
  monthly_trends: TrendItem[];
  ageing_distribution: AgeingBucket[];
  category_distribution: CategoryBreakdown[];
  recent_actions: RecentActionItem[];
  high_priority_items: HighPriorityItem[];
}

export async function getDashboardStats(bureau?: string): Promise<DashboardStats> {
  return apiRequest<DashboardStats>("/dashboard/stats", {
    params: bureau ? { bureau } : {},
  });
}
