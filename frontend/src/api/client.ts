function getBaseUrl(): string {
  let envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    envUrl = String(envUrl).trim();
    // If Render injected internal private hostname 'aicte-sentinel-api' without a public domain extension
    if (!envUrl.includes(".")) {
      envUrl = `${envUrl}.onrender.com`;
    }
    const cleanUrl = envUrl.startsWith("http://") || envUrl.startsWith("https://")
      ? envUrl.replace(/\/+$/, "")
      : `https://${envUrl.replace(/\/+$/, "")}`;
    return `${cleanUrl}/api/v1`;
  }

  // If running on Render static domain, automatically target the live Render API
  if (typeof window !== "undefined" && window.location.hostname.includes("onrender.com")) {
    return "https://aicte-sentinel-api.onrender.com/api/v1";
  }

  // Local development fallback
  return "/api/v1";
}


export const BASE_URL = getBaseUrl();

interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...customConfig } = options;

  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const token = localStorage.getItem("token");
  const defaultHeaders: Record<string, string> = {
    Accept: "application/json",
  };

  if (!(customConfig.body instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...customConfig,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  };

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (networkErr: any) {
    throw new Error(`Cannot reach backend service. If the server is asleep, please wait 30 seconds for it to start. (${networkErr.message})`);
  }

  if (response.status === 401) {
    // Check if token expired or invalid
    if (!endpoint.includes("/auth/login")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth-changed"));
    }
  }

  let rawText = "";
  try {
    rawText = await response.text();
  } catch (readErr: any) {
    throw new Error(`Failed reading response stream: ${readErr.message}`);
  }

  const trimmed = rawText.trim();
  const isHtml = trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || trimmed.startsWith("<head");

  if (!response.ok) {
    if (isHtml) {
      throw new Error(`Backend server is currently starting up (HTTP ${response.status}). Please wait ~30 seconds and retry.`);
    }
    let errorMessage = response.statusText || `Request failed with status ${response.status}`;
    if (trimmed) {
      try {
        const errorData = JSON.parse(trimmed);
        errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
      } catch {
        errorMessage = trimmed.slice(0, 150);
      }
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses (like 204 No Content or zero bytes)
  if (response.status === 204 || !trimmed) {
    return {} as T;
  }

  if (isHtml) {
    throw new Error("Backend server is currently starting up. Please wait 30 seconds and refresh.");
  }

  try {
    return JSON.parse(trimmed);
  } catch (parseErr: any) {
    throw new Error(`Invalid response format from server: ${parseErr.message}`);
  }
}


export async function downloadCsv(endpoint: string, params: Record<string, any> = {}, defaultFilename = "export.csv") {
  const token = localStorage.getItem("token");
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, String(value));
    }
  });

  const url = `${BASE_URL}${endpoint}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const response = await fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to download CSV export");
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  let filename = defaultFilename;
  if (disposition && disposition.indexOf("filename=") !== -1) {
    filename = disposition.split("filename=")[1].replace(/["']/g, "");
  }

  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}
