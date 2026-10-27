import { apiRequest } from "./client";
import { User } from "./auth";

export interface CreateUserPayload {
  username: string;
  email: string;
  full_name: string;
  password: string;
  role: string;
  bureau: string;
  region: string;
}

export async function getUsers(params: { bureau?: string; role?: string } = {}): Promise<User[]> {
  return apiRequest<User[]>("/users", { params });
}

export async function getOfficers(bureau?: string): Promise<User[]> {
  return apiRequest<User[]>("/users/officers", {
    params: bureau ? { bureau } : {},
  });
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  return apiRequest<User>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
