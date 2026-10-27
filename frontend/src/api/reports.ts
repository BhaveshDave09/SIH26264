import { apiRequest, downloadCsv } from "./client";

export interface BureauSummaryItem {
  bureau: string;
  total_received: number;
  pending: number;
  disposed: number;
  overdue: number;
  disposal_rate: number;
  avg_age_days: number;
}

export interface RegionSummaryItem {
  region: string;
  total_institutions: number;
  total_cases: number;
  active_cases: number;
  overdue_cases: number;
}

export interface ReportStats {
  bureau_summary: BureauSummaryItem[];
  region_summary: RegionSummaryItem[];
  total_cases_analyzed: number;
  avg_resolution_days: number;
  total_confirmed_overlaps: number;
  total_coordination_tasks: number;
  coordination_resolution_rate: number;
}

export async function getReportStats(params: {
  start_date?: string;
  end_date?: string;
  bureau?: string;
  region?: string;
} = {}): Promise<ReportStats> {
  return apiRequest<ReportStats>("/reports/stats", { params });
}

export async function exportFilteredCasesCsv(params: {
  bureau?: string;
  status?: string;
  priority?: string;
  region?: string;
} = {}) {
  await downloadCsv("/reports/export/csv", params, "AICTE_Sentinel_Cases_Export.csv");
}
