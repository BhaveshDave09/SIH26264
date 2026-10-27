import { apiRequest } from "./client";

export interface AuditEventItem {
  id: number;
  event_uuid: string;
  actor_username: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  timestamp: string;
  details: string;
  reason?: string;
  previous_event_hash: string;
  event_hash: string;
}

export interface AuditVerificationResult {
  is_valid: boolean;
  total_events: number;
  genesis_hash: string;
  latest_hash: string;
  broken_at_event_id?: number;
  details: string;
  verification_timestamp: string;
}

export async function getAuditTrail(params: {
  entity_type?: string;
  entity_id?: string;
  action?: string;
  actor?: string;
  limit?: number;
} = {}): Promise<AuditEventItem[]> {
  return apiRequest<AuditEventItem[]>("/audit/events", { params });
}

export async function verifyAuditChain(): Promise<AuditVerificationResult> {
  return apiRequest<AuditVerificationResult>("/audit/verify");
}

export async function simulateTamper(): Promise<{ message: string; tampered_event_id: number; original_hash: string; corrupted_hash: string }> {
  return apiRequest("/audit/simulate-tamper", { method: "POST" });
}

export async function restoreAuditChain(): Promise<{ message: string }> {
  return apiRequest("/audit/restore-chain", { method: "POST" });
}
