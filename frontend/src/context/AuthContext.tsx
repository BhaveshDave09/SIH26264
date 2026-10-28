import React, { createContext, useContext, useState, useEffect } from "react";
import { User, loginUser, logoutUser, getCurrentUser } from "../api/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (u: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
  switchDemoRole: (username: string) => Promise<void>;
}

const DEMO_CREDENTIALS: Record<string, string> = {
  superadmin: "Admin@123",
  rb_head: "Bureau@123",
  pgrc_head: "Bureau@123",
  rb_officer: "Officer@123",
  pgrc_officer: "Officer@123",
  approval_officer: "Officer@123",
  regional_south: "Regional@123",
  viewer: "Viewer@123",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("user");
      if (saved && saved !== "undefined" && saved !== "null") {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to parse cached user:", e);
      try {
        localStorage.removeItem("user");
      } catch {}
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      getCurrentUser()
        .then((u) => {
          if (u) {
            setUser(u);
            localStorage.setItem("user", JSON.stringify(u));
          }
        })
        .catch(() => {
          setUser(null);
          try {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
          } catch {}
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    const handleAuthChanged = () => {
      setUser(null);
    };
    window.addEventListener("auth-changed", handleAuthChanged);
    return () => window.removeEventListener("auth-changed", handleAuthChanged);
  }, []);

  const login = async (u: string, p: string) => {
    const res = await loginUser(u, p);
    if (res?.access_token) {
      localStorage.setItem("token", res.access_token);
    }
    if (res?.user) {
      localStorage.setItem("user", JSON.stringify(res.user));
      setUser(res.user);
    }
  };

  const logout = async () => {
    await logoutUser();
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch {}
    setUser(null);
  };

  const switchDemoRole = async (username: string) => {
    const pwd = DEMO_CREDENTIALS[username] || "Admin@123";
    await login(username, pwd);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, switchDemoRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
