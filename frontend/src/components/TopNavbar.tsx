import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Shield, ChevronDown, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getNotifications, NotificationItem, markNotificationAsRead } from "../api/notifications";

const DEMO_ROLES = [
  { username: "superadmin", label: "Super Administrator (All Bureaus)", tag: "Admin" },
  { username: "rb_head", label: "Prof. Sunita Rao (RB Head)", tag: "RB Head" },
  { username: "pgrc_head", label: "Dr. Rajeshwar Verma (PGRC Head)", tag: "PGRC Head" },
  { username: "rb_officer", label: "Vikramaditya Sen (RB Officer)", tag: "RB Officer" },
  { username: "pgrc_officer", label: "Pooja Deshmukh (PGRC Officer)", tag: "PGRC Officer" },
  { username: "regional_south", label: "K. Ramanathan (Regional Officer South)", tag: "Regional" },
  { username: "viewer", label: "Meenakshi Sundaram (Read-Only Viewer)", tag: "Viewer" },
];

export const TopNavbar: React.FC = () => {
  const { user, switchDemoRole } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (user) {
      getNotifications()
        .then(setNotifications)
        .catch(() => {});
    }
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/cases?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const handleRoleSelect = async (username: string) => {
    setSwitching(true);
    setShowRoleSwitcher(false);
    try {
      await switchDemoRole(username);
    } finally {
      setSwitching(false);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      await markNotificationAsRead(notif.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    }
    if (notif.link) {
      setShowNotifications(false);
      navigate(notif.link);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Global Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative w-96">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search Case ID, Institution, or AICTE ID (Press Enter)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
        />
      </form>

      {/* Actions: Demo Role Switcher & Notifications */}
      <div className="flex items-center gap-3">
        {/* Quick Role Switcher for SIH 2026 Evaluation */}
        <div className="relative">
          <button
            onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
            title="Switch demo persona to test RB vs PGRC workflows"
          >
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-semibold text-slate-900">
              Role: {user?.role.replace("_", " ")} ({user?.bureau})
            </span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          {showRoleSwitcher && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Select Demo Persona (SIH Evaluator)
                </p>
                <p className="text-[11px] text-slate-500">
                  Switch roles instantly to test RB vs PGRC cross-bureau actions.
                </p>
              </div>
              <div className="max-h-72 overflow-y-auto py-1">
                {DEMO_ROLES.map((r) => (
                  <button
                    key={r.username}
                    onClick={() => handleRoleSelect(r.username)}
                    disabled={switching}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-blue-50 transition-colors ${
                      user?.username === r.username ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-700"
                    }`}
                  >
                    <div>
                      <p className="font-medium">{r.label}</p>
                      <p className="text-[10px] text-slate-400">@{r.username}</p>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-700">
                      {r.tag}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors relative cursor-pointer"
            title="Notifications & Overlap Alerts"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-88 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Notifications</h4>
                  <p className="text-[11px] text-slate-500">{unreadCount} unread system alerts</p>
                </div>
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    navigate("/notifications");
                  }}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  View All
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <p className="p-4 text-xs text-center text-slate-400">No active alerts</p>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3 text-xs hover:bg-slate-50 cursor-pointer transition-colors ${
                        !n.is_read ? "bg-blue-50/40" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {n.notification_type.includes("CONFLICT") || n.notification_type.includes("OVERLAP") ? (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 leading-snug">{n.title}</p>
                          <p className="text-slate-600 text-[11px] mt-0.5 line-clamp-2">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
