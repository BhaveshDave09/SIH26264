import { apiRequest } from "./client";

export interface CaseHistoryItem {
  id: number;
  actor_username: string;
  action_type: string;
  previous_status?: string;
  new_status?: string;
  previous_bureau?: string;
  new_bureau?: string;
  remarks: string;
  timestamp: string;
}

export interface DocumentItem {
  id: number;
  original_filename: string;
  file_size_bytes: number;
  content_type: string;
  uploaded_by_username: string;
  uploaded_at: string;
}

export interface CaseItem {
  id: string;
  institution_id: number;
  institution_name?: string;
  institution_permanent_id?: string;
  institution_state?: string;
  institution_region?: string;
  complainant_name: string;
  complainant_type: string;
  title: string;
  description: string;
  category: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  status: "Received" | "Pending Review" | "Under Process" | "Transferred" | "Escalated" | "Disposed" | "Closed";
  assigned_bureau: string;
  assigned_officer_id?: number;
  assigned_officer_name?: string;
  received_date: string;
  expected_disposal_date: string;
  last_action?: string;
  next_action_required?: string;
  is_escalated: boolean;
  escalation_reason?: string;
  created_at: string;
  updated_at: string;
  history?: CaseHistoryItem[];
  documents?: DocumentItem[];
  has_potential_overlap?: boolean;
  overlap_count?: number;
}

export interface CaseListResponse {
  items: CaseItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CaseFilterParams {
  q?: string;
  bureau?: string;
  status?: string;
  priority?: string;
  category?: string;
  region?: string;
  institution_id?: number;
  is_overdue?: boolean;
  has_overlap?: boolean;
  page?: number;
  page_size?: number;
}

export interface CreateCasePayload {
  institution_id: number;
  complainant_name: string;
  complainant_type: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  assigned_bureau: string;
  assigned_officer_id?: number;
  expected_disposal_date: string;
  next_action_required?: string;
}

export async function getCases(params: CaseFilterParams = {}): Promise<CaseListResponse> {
  return apiRequest<CaseListResponse>("/cases", { params });
}

export async function getCaseById(id: string): Promise<CaseItem> {
  return apiRequest<CaseItem>(`/cases/${encodeURIComponent(id)}`);
}

export async function createCase(payload: CreateCasePayload): Promise<CaseItem> {
  return apiRequest<CaseItem>("/cases", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCase(id: string, payload: Partial<CreateCasePayload>): Promise<CaseItem> {
  return apiRequest<CaseItem>(`/cases/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function assignOfficer(id: string, assigned_officer_id: number, remarks: string): Promise<CaseItem> {
  return apiRequest<CaseItem>(`/cases/${encodeURIComponent(id)}/assign`, {
    method: "POST",
    body: JSON.stringify({ assigned_officer_id, remarks }),
  });
}

export async function transferCase(id: string, target_bureau: string, mandatory_reason: string): Promise<CaseItem> {
  return apiRequest<CaseItem>(`/cases/${encodeURIComponent(id)}/transfer`, {
    method: "POST",
    body: JSON.stringify({ target_bureau, mandatory_reason }),
  });
}

export async function updateCaseStatus(id: string, status: string, mandatory_remark: string, next_action_required?: string): Promise<CaseItem> {
  return apiRequest<CaseItem>(`/cases/${encodeURIComponent(id)}/status`, {
    method: "POST",
    body: JSON.stringify({ status, mandatory_remark, next_action_required }),
  });
}

export async function uploadCaseDocument(caseId: string, file: File): Promise<DocumentItem> {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<DocumentItem>(`/documents/cases/${encodeURIComponent(caseId)}/upload`, {
    method: "POST",
    body: formData,
  });
}
