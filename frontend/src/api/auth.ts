import { apiRequest } from "./client";

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: "SUPER_ADMIN" | "BUREAU_HEAD" | "BUREAU_OFFICER" | "REGIONAL_OFFICER" | "READ_ONLY";
  bureau: string;
  region: string;
  is_active: boolean;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export async function loginUser(username: string, password: string): Promise<LoginResponse> {
  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);

  const res = await fetch("/api/v1/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  if (!res.ok) {
    let msg = "Invalid username or password";
    try {
      const err = await res.json();
      msg = err.detail || msg;
    } catch {}
    throw new Error(msg);
  }

  return res.json();
}

export async function getCurrentUser(): Promise<User> {
  return apiRequest<User>("/auth/me");
}

export async function logoutUser(): Promise<{ message: string }> {
  try {
    return await apiRequest<{ message: string }>("/auth/logout", { method: "POST" });
  } finally {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
}
