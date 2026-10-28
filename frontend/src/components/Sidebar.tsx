import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  FolderGit2,
  GitCompare,
  Network,
  ClockAlert,
  BarChart3,
  Bell,
  ShieldCheck,
  Users,
  LogOut,
  Shield,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Badge } from "./Badge";

interface NavItem {
  name: string;
  to: string;
  icon: React.ElementType;
  badge?: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Overview", to: "/", icon: LayoutDashboard },
  { name: "Institutions", to: "/institutions", icon: Building2 },
  { name: "All Cases", to: "/cases", icon: FolderGit2 },
  { name: "Overlap Intelligence", to: "/intelligence", icon: GitCompare, badge: "USP" },
  { name: "Coordination Center", to: "/coordination", icon: Network },
  { name: "SLA & Escalations", to: "/sla", icon: ClockAlert },
  { name: "Reports & Analytics", to: "/reports", icon: BarChart3 },
  { name: "Notifications", to: "/notifications", icon: Bell },
  { name: "Audit Trail", to: "/audit", icon: ShieldCheck },
  { name: "User Management", to: "/users", icon: Users, adminOnly: true },
];

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 h-screen sticky top-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-linear-to-br from-blue-600 to-teal-500 flex items-center justify-center text-white shadow-md">
          <Shield className="w-6 h-6 stroke-[2.2]" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white text-base tracking-tight">NivaranX</span>
          </div>
          <p className="text-[10px] text-teal-400 font-medium uppercase tracking-wider">
            SIH 2026 • PS ID: 26264
          </p>
        </div>
      </div>

      {/* Bureau Jurisdiction Badge */}
      {user && (
        <div className="px-4 py-2.5 bg-slate-800/60 border-b border-slate-800 text-xs flex items-center justify-between">
          <span className="text-slate-400">Bureau Scope:</span>
          <span className="font-semibold text-blue-400">{user.bureau}</span>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          if (item.adminOnly && user?.role !== "SUPER_ADMIN") {
            return null;
          }

          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      {user && (
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-start justify-between">
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
              <p className="text-xs text-slate-400 truncate">@{user.username}</p>
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                <Badge variant="neutral" className="bg-slate-800 text-slate-300 border-slate-700 text-[10px]">
                  {user.role.replace("_", " ")}
                </Badge>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
