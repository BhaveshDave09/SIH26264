import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  FolderGit2,
  AlertTriangle,
  ClockAlert,
  CheckCircle2,
  ArrowRightLeft,
  Activity,
  GitCompare,
  TrendingUp,
  Building2,
  Calendar,
  ArrowRight,
  Filter,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { getDashboardStats } from "../api/dashboard";
import { useAuth } from "../context/AuthContext";
import { Badge } from "../components/Badge";
import { LoadingState } from "../components/LoadingState";

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [bureauFilter, setBureauFilter] = useState<string>("ALL");

  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard-stats", bureauFilter],
    queryFn: () => getDashboardStats(bureauFilter === "ALL" ? undefined : bureauFilter),
  });

  if (isLoading) return <LoadingState message="Calculating executive dashboard metrics from database..." />;
  if (error || !stats) {
    return (
      <div className="p-8 text-center text-rose-600 bg-rose-50 border border-rose-200 rounded-xl my-6">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
        <p className="font-semibold">Failed to load dashboard data</p>
        <p className="text-xs text-rose-500 mt-1">{String(error)}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-medium cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Bureau Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Case Intelligence Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Unified monitoring, cross-Bureau overlap intelligence, and statutory SLA deadline tracking
          </p>
        </div>

        {/* Bureau Filter */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-600">Filter Bureau:</span>
          <select
            value={bureauFilter}
            onChange={(e) => setBureauFilter(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
          >
            <option value="ALL">All AICTE Bureaus / Cells</option>
            <option value="RB">Regulation Bureau (RB)</option>
            <option value="PGRC">Public Grievance Redressal Cell (PGRC)</option>
            <option value="APPROVAL_BUREAU">Approval Bureau</option>
            <option value="FINANCE_BUREAU">Finance Bureau</option>
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Received */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Received</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <FolderGit2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{stats.total_cases}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Live database records</span>
        </div>

        {/* Pending Review */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Review</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">{stats.pending_cases}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Awaiting officer action</span>
        </div>

        {/* Under Process */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Under Process</span>
            <span className="p-2 bg-sky-50 text-sky-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-sky-700 mt-2">{stats.under_process_cases}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Active investigations</span>
        </div>

        {/* Disposed Cases */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Disposed / Resolved</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{stats.disposed_cases}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Fully closed proceedings</span>
        </div>

        {/* Overdue Cases */}
        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs bg-rose-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Overdue SLA Cases</span>
            <span className="p-2 bg-rose-100 text-rose-600 rounded-lg">
              <ClockAlert className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-rose-700 mt-2">{stats.overdue_cases}</p>
          <Link to="/sla" className="text-[11px] text-rose-600 font-medium hover:underline mt-1 inline-block">
            View Overdue & Escalated →
          </Link>
        </div>

        {/* Approaching Deadlines */}
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Due in &le; 7 Days</span>
            <span className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-2">{stats.approaching_deadline_cases}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Immediate attention required</span>
        </div>

        {/* Cross-Bureau Overlaps Alert */}
        <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-xs bg-purple-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-800 uppercase tracking-wider">Cross-Bureau Alerts</span>
            <span className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <GitCompare className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-purple-700 mt-2">{stats.open_coordination_alerts}</p>
          <Link to="/intelligence" className="text-[11px] text-purple-700 font-semibold hover:underline mt-1 inline-block">
            Examine Overlap Intelligence →
          </Link>
        </div>

        {/* Transferred Cases */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inter-Bureau Transfers</span>
            <span className="p-2 bg-slate-100 text-slate-600 rounded-lg">
              <ArrowRightLeft className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-700 mt-2">{stats.transferred_cases}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">With documented reasons</span>
        </div>
      </div>

      {/* Coordination Health Score Panel */}
      <div className="bg-linear-to-r from-slate-900 to-blue-950 rounded-2xl p-6 text-white shadow-lg border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30">
              CORE METRIC
            </span>
            <h3 className="text-lg font-bold">Inter-Bureau Coordination Health Index</h3>
          </div>
          <p className="text-xs text-blue-200 max-w-2xl leading-relaxed">
            {stats.coordination_health_explanation}
          </p>
          <p className="text-[11px] text-slate-400">
            Formula dynamically weights unresolved cross-bureau overlap candidates, overdue tasks, and SLA breach escalations.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-800/80 px-6 py-4 rounded-xl border border-slate-700 shrink-0">
          <div className="text-center">
            <div className="text-4xl font-extrabold text-teal-400 tracking-tight">
              {stats.coordination_health_score}
              <span className="text-lg text-slate-400 font-normal">/100</span>
            </div>
            <span className="text-[11px] text-slate-300 uppercase tracking-wider font-semibold">
              {stats.coordination_health_score >= 80 ? "Optimal" : stats.coordination_health_score >= 60 ? "Moderate" : "Critical"}
            </span>
          </div>
          <div className="border-l border-slate-700 pl-4 space-y-1 text-xs">
            <div className="text-slate-300">
              Active Tasks: <span className="font-semibold text-white">{stats.active_coordination_tasks}</span>
            </div>
            <div className="text-slate-300">
              Open Alerts: <span className="font-semibold text-amber-400">{stats.open_coordination_alerts}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section: Bureau-wise Workload & Monthly Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bureau Workload Bar Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Bureau-Wise Workload</h3>
              <p className="text-xs text-slate-500">Distribution of active and disposed cases across AICTE cells</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.bureau_workload} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="bureau" textAnchor="middle" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="pending_cases" name="Pending Cases" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="disposed_cases" name="Disposed Cases" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="overdue_cases" name="Overdue Cases" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Complaint Trends Line Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Monthly Intake & Disposal Trends</h3>
              <p className="text-xs text-slate-500">Historical velocity over the last 6 months</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.monthly_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: "12px", borderRadius: "8px" }} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Line type="monotone" dataKey="received_count" name="Cases Lodged" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="disposed_count" name="Cases Disposed" stroke="#059669" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Ageing Distribution & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Case Ageing Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">Case Ageing Distribution</h3>
          <p className="text-xs text-slate-500 mb-4">Active cases grouped by elapsed calendar days</p>
          <div className="space-y-3">
            {stats.ageing_distribution.map((b) => (
              <div key={b.bucket}>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>{b.bucket}</span>
                  <span>{b.count} Cases</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${
                      b.bucket.includes("60+")
                        ? "bg-rose-500"
                        : b.bucket.includes("31")
                        ? "bg-amber-500"
                        : "bg-blue-600"
                    }`}
                    style={{ width: `${Math.min(100, (b.count / Math.max(1, stats.total_cases)) * 100 * 2.5)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* High-Priority Cases Requiring Immediate Attention */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">High-Priority Cases</h3>
              <p className="text-xs text-slate-500">Critical items flagged by severity, overdue state, or cross-bureau alerts</p>
            </div>
            <Link to="/cases?priority=Critical" className="text-xs text-blue-700 hover:underline font-semibold">
              View All Priority →
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {stats.high_priority_items.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700">{item.id}</span>
                    <Badge variant="priority" value={item.priority}>
                      {item.priority}
                    </Badge>
                    <Badge variant="bureau" value={item.assigned_bureau}>
                      {item.assigned_bureau}
                    </Badge>
                    {item.is_overdue && <Badge variant="danger">OVERDUE SLA</Badge>}
                    {item.has_overlap_alert && (
                      <Badge variant="relationship" className="bg-purple-100 text-purple-800">
                        OVERLAP ALERT
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-900 truncate mt-1">{item.title}</p>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    <span>{item.institution_name}</span>
                  </p>
                </div>

                <Link
                  to={`/cases/${encodeURIComponent(item.id)}`}
                  className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-slate-100 rounded-md transition-colors"
                >
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Actions Chronology */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Case Actions</h3>
            <p className="text-xs text-slate-500">Chronological ledger of official inter-bureau movements and status updates</p>
          </div>
          <Link to="/audit" className="text-xs text-blue-700 hover:underline font-semibold">
            View Complete Tamper-Evident Audit Trail →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-3 py-2">Timestamp (UTC)</th>
                <th className="px-3 py-2">Case ID</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Details / Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recent_actions.map((act) => (
                <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3 py-2 text-slate-500 font-mono text-[11px]">{act.timestamp}</td>
                  <td className="px-3 py-2 font-mono font-bold text-blue-700">
                    <Link to={`/cases/${encodeURIComponent(act.case_id)}`} className="hover:underline">
                      {act.case_id}
                    </Link>
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-800">@{act.actor}</td>
                  <td className="px-3 py-2">
                    <Badge variant="neutral" className="text-[10px]">
                      {act.action_type}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-slate-600 max-w-md truncate">{act.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
