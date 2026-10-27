import { apiRequest } from "./client";

export interface CaseRelationshipItem {
  id: number;
  case_id_1: string;
  case_id_2: string;
  case_1_title?: string;
  case_2_title?: string;
  case_1_bureau?: string;
  case_2_bureau?: string;
  case_1_status?: string;
  case_2_status?: string;
  case_1_category?: string;
  case_2_category?: string;
  institution_id: number;
  institution_name?: string;
  institution_permanent_id?: string;
  relationship_type: "POTENTIAL_DUPLICATE" | "RELATED_CASE" | "ACTION_CONFLICT" | "COORDINATION_RECOMMENDED";
  similarity_score: number;
  matching_signals: string[];
  status: "DETECTED" | "CONFIRMED_RELATED" | "MARKED_DUPLICATE" | "DISMISSED" | "COORDINATION_FLAGGED";
  explanation: string;
  recommended_action: string;
  reviewed_by?: string;
  review_decision_reason?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface ReviewRelationshipPayload {
  decision: "CONFIRMED_RELATED" | "MARKED_DUPLICATE" | "DISMISSED" | "COORDINATION_FLAGGED";
  reason: string;
  create_coordination_task?: boolean;
  task_owner_id?: number;
  task_due_days?: number;
}

export async function getRelationships(params: { status?: string; institution_id?: number; case_id?: string } = {}): Promise<CaseRelationshipItem[]> {
  return apiRequest<CaseRelationshipItem[]>("/intelligence/relationships", { params });
}

export async function getRelationshipById(id: number): Promise<CaseRelationshipItem> {
  return apiRequest<CaseRelationshipItem>(`/intelligence/relationships/${id}`);
}

export async function reviewRelationship(id: number, payload: ReviewRelationshipPayload): Promise<CaseRelationshipItem> {
  return apiRequest<CaseRelationshipItem>(`/intelligence/relationships/${id}/review`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function triggerIntelligenceScan(): Promise<{ scanned_cases: number; new_relationships_detected: number; message: string }> {
  return apiRequest("/intelligence/scan", { method: "POST" });
}
