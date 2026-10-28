import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, User, ArrowRight, AlertCircle, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Invalid login credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (u: string, p: string) => {
    setError(null);
    setLoading(true);
    try {
      await login(u, p);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to sign in with demo credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-linear-to-r from-blue-900 via-blue-800 to-slate-900 p-6 text-center text-white">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-600/30 border border-blue-400/30 mb-3 shadow-inner">
            <Shield className="w-8 h-8 text-teal-400 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">NivaranX</h1>
          <p className="text-xs text-blue-200 mt-1 max-w-xs mx-auto">
            Integrated Dashboard for Monitoring & Tracking Cases Across AICTE Bureaus / Cells
          </p>
          <div className="mt-3 inline-block px-3 py-1 bg-teal-500/20 border border-teal-400/30 rounded-full text-[11px] font-semibold text-teal-300">
            Smart India Hackathon 2026 • PS ID: 26264
          </div>
        </div>

        {/* Login Form */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Official Username</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. rb_head or superadmin"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-medium text-sm rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? "Authenticating..." : "Sign In to NivaranX"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick 1-Click Demo Login Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Quick Demo Accounts (1-Click Test Access)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDemoLogin("superadmin", "Admin@123")}
                className="p-2 border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 rounded-lg text-left transition-colors cursor-pointer"
              >
                <p className="font-bold text-slate-900">Super Admin</p>
                <p className="text-[10px] text-slate-500">All Bureaus & Admin</p>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin("rb_head", "Bureau@123")}
                className="p-2 border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 rounded-lg text-left transition-colors cursor-pointer"
              >
                <p className="font-bold text-indigo-950">RB Head</p>
                <p className="text-[10px] text-slate-500">Regulation Bureau</p>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin("pgrc_head", "Bureau@123")}
                className="p-2 border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 rounded-lg text-left transition-colors cursor-pointer"
              >
                <p className="font-bold text-teal-950">PGRC Head</p>
                <p className="text-[10px] text-slate-500">Grievance Redressal</p>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin("regional_south", "Regional@123")}
                className="p-2 border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:border-sky-300 rounded-lg text-left transition-colors cursor-pointer"
              >
                <p className="font-bold text-sky-950">Regional Officer</p>
                <p className="text-[10px] text-slate-500">South Jurisdiction</p>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-3">
              Prototype Note: Demo credentials use salted PBKDF2 hash & JWT sessions. Production requires AICTE SSO integration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
