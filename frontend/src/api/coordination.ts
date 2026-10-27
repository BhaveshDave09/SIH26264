import { apiRequest } from "./client";

export interface CoordinationUpdateItem {
  id: number;
  task_id: string;
  user_id: number;
  username: string;
  update_type: "COMMENT" | "STATUS_CHANGE" | "REASSIGNMENT" | "HANDOFF";
  remarks: string;
  timestamp: string;
}

export interface CoordinationTaskItem {
  id: string;
  title: string;
  description: string;
  institution_id: number;
  institution_name?: string;
  institution_permanent_id?: string;
  primary_case_id: string;
  related_case_ids: string[];
  originating_bureau: string;
  participating_bureaus: string[];
  assigned_owner_id: number;
  assigned_owner_name?: string;
  created_by_id: number;
  creator_name?: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  status: "Open" | "Accepted" | "In Progress" | "Waiting for Response" | "Resolved" | "Cancelled";
  due_date: string;
  is_overdue: boolean;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
  updates?: CoordinationUpdateItem[];
}

export interface CreateCoordinationTaskPayload {
  title: string;
  description: string;
  institution_id: number;
  primary_case_id: string;
  related_case_ids: string[];
  originating_bureau: string;
  participating_bureaus: string[];
  assigned_owner_id: number;
  priority: string;
  due_date: string;
}

export async function getCoordinationTasks(params: {
  status?: string;
  priority?: string;
  bureau?: string;
  institution_id?: number;
  is_overdue?: boolean;
} = {}): Promise<CoordinationTaskItem[]> {
  return apiRequest<CoordinationTaskItem[]>("/coordination/tasks", { params });
}

export async function getCoordinationTaskById(id: string): Promise<CoordinationTaskItem> {
  return apiRequest<CoordinationTaskItem>(`/coordination/tasks/${encodeURIComponent(id)}`);
}

export async function createCoordinationTask(payload: CreateCoordinationTaskPayload): Promise<CoordinationTaskItem> {
  return apiRequest<CoordinationTaskItem>("/coordination/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCoordinationTask(
  id: string,
  payload: Partial<CoordinationTaskItem>
): Promise<CoordinationTaskItem> {
  return apiRequest<CoordinationTaskItem>(`/coordination/tasks/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function addCoordinationUpdate(
  id: string,
  payload: {
    update_type: string;
    remarks: string;
    new_status?: string;
    new_owner_id?: number;
  }
): Promise<CoordinationUpdateItem> {
  return apiRequest<CoordinationUpdateItem>(`/coordination/tasks/${encodeURIComponent(id)}/updates`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
