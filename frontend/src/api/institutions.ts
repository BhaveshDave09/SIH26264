import { apiRequest } from "./client";

export interface InstitutionAlias {
  id: number;
  alias_name: string;
}

export interface InstitutionItem {
  id: number;
  permanent_id: string;
  name: string;
  normalized_name: string;
  address: string;
  state: string;
  region: string;
  category: string;
  status: "Active" | "Under Scrutiny" | "Deficient";
  aliases?: InstitutionAlias[];
  created_at: string;
  updated_at: string;
}

export interface Institution360Detail extends InstitutionItem {
  total_cases: number;
  cases_by_status: Record<string, number>;
  cases_by_bureau: Record<string, number>;
  active_coordination_count: number;
  overlap_alerts_count: number;
}

export interface CreateInstitutionPayload {
  permanent_id: string;
  name: string;
  address: string;
  state: string;
  region: string;
  category: string;
  status: string;
  aliases?: string[];
}

export async function getInstitutions(params: { q?: string; region?: string; state?: string; status?: string } = {}): Promise<InstitutionItem[]> {
  return apiRequest<InstitutionItem[]>("/institutions", { params });
}

export async function getInstitution360(id: number): Promise<Institution360Detail> {
  return apiRequest<Institution360Detail>(`/institutions/${id}`);
}

export async function createInstitution(payload: CreateInstitutionPayload): Promise<InstitutionItem> {
  return apiRequest<InstitutionItem>("/institutions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
