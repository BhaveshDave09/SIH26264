import { apiRequest, BASE_URL } from "./client";

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

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });
  } catch (netErr: any) {
    throw new Error(`Cannot reach authentication server. If the server is asleep, please wait 30 seconds for it to start. (${netErr.message})`);
  }

  let rawText = "";
  try {
    rawText = await res.text();
  } catch (readErr: any) {
    throw new Error(`Failed to read response: ${readErr.message}`);
  }

  const trimmed = rawText.trim();
  const lower = trimmed.toLowerCase();
  const isHtml = trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || trimmed.startsWith("<head") || lower.includes("<!doctype html") || lower.includes("<html");

  if (!res.ok) {
    if (isHtml) {
      throw new Error(`Authentication server is currently waking up (HTTP ${res.status}). Please wait ~30 seconds and retry.`);
    }
    let msg = "Invalid username or password";
    if (trimmed) {
      try {
        const err = JSON.parse(trimmed);
        if (typeof err === "string") {
          msg = err;
        } else if (err && typeof err.detail === "string") {
          msg = err.detail;
        } else if (err && Array.isArray(err.detail)) {
          msg = err.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ");
        } else if (err && typeof err.message === "string") {
          msg = err.message;
        } else {
          msg = JSON.stringify(err);
        }
      } catch {
        msg = trimmed.slice(0, 150);
      }
    }
    throw new Error(msg);
  }

  if (!trimmed) {
    throw new Error("Authentication server returned an empty response. Please retry.");
  }

  if (isHtml) {
    throw new Error("Authentication service returned an unexpected HTML response. The backend is likely still starting up.");
  }

  try {
    return JSON.parse(trimmed);
  } catch (parseErr: any) {
    throw new Error(`Authentication parse error: ${parseErr.message}`);
  }
}

export async function getCurrentUser(): Promise<User> {
  return apiRequest<User>("/auth/me");
}

export async function logoutUser(): Promise<void> {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } catch {
    // Local cleanup always succeeds
  }
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}
