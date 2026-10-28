import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ArrowRight, RotateCw } from "lucide-react";
import { getSLASummary, triggerSLAEvaluation } from "../api/sla";
import { useAuth } from "../context/AuthContext";
import { Badge } from "../components/Badge";
import { LoadingState } from "../components/LoadingState";

export const SLAPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"overdue_cases" | "approaching_cases" | "overdue_tasks">(
    "overdue_cases"
  );
  const [evalSuccessMsg, setEvalSuccessMsg] = useState<string | null>(null);

  const { data: sla, isLoading, error } = useQuery({
    queryKey: ["sla-summary"],
    queryFn: getSLASummary,
  });

  const evaluateMutation = useMutation({
    mutationFn: triggerSLAEvaluation,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sla-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      setEvalSuccessMsg(
        `SLA Evaluation complete: Identified ${data.total_overdue_cases} overdue cases, ${data.total_escalated_cases} escalated cases, and ${data.total_overdue_tasks} overdue tasks.`
      );
      setTimeout(() => setEvalSuccessMsg(null), 8000);
    },
  });

  if (isLoading) return <LoadingState message="Evaluating statutory deadlines and escalation timers..." />;
  if (error || !sla) {
    return (
      <div className="p-8 text-center text-rose-600 bg-rose-50 border border-rose-200 rounded-xl">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
        <h3 className="font-bold">Failed to load SLA Engine metrics</h3>
        <p className="text-xs text-rose-500 mt-1">{String(error)}</p>
      </div>
    );
  }

  const isReadOnly = user?.role === "READ_ONLY";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            SLA &amp; Escalation Monitoring Engine
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configurable deadline tracking, statutory ageing calculations, and automated multi-tier escalation triggers
          </p>
        </div>

        {!isReadOnly && (
          <button
            onClick={() => evaluateMutation.mutate()}
            disabled={evaluateMutation.isPending}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer self-start md:self-auto disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${evaluateMutation.isPending ? "animate-spin" : ""}`} />
            <span>{evaluateMutation.isPending ? "Evaluating SLA Rules..." : "Trigger SLA Auto-Escalation Cycle"}</span>
          </button>
        )}
      </div>

      {evalSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{evalSuccessMsg}</span>
        </div>
      )}

      {/* SLA Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs bg-rose-50/20">
          <span className="text-[10px] text-rose-700 font-bold uppercase tracking-wider">Overdue Cases</span>
          <p className="text-2xl font-bold text-rose-700 mt-1">{sla.total_overdue_cases}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Beyond expected disposal date</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
          <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">
            Approaching Deadline (&le; {sla.warning_threshold_days}d)
          </span>
          <p className="text-2xl font-bold text-amber-700 mt-1">{sla.total_approaching_cases}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">In jeopardy threshold window</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-xs bg-purple-50/20">
          <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider">Escalated Cases</span>
          <p className="text-2xl font-bold text-purple-700 mt-1">{sla.total_escalated_cases}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Referred to Bureau Head</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Overdue Tasks</span>
          <p className="text-2xl font-bold text-slate-800 mt-1">{sla.total_overdue_tasks}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Inter-bureau handoffs delayed</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab("overdue_cases")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "overdue_cases"
              ? "border-rose-600 text-rose-700 bg-rose-50/30"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Overdue Cases ({sla.overdue_cases.length})
        </button>

        <button
          onClick={() => setActiveTab("approaching_cases")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "approaching_cases"
              ? "border-amber-600 text-amber-700 bg-amber-50/30"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Approaching Deadlines ({sla.approaching_cases.length})
        </button>

        <button
          onClick={() => setActiveTab("overdue_tasks")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "overdue_tasks"
              ? "border-purple-600 text-purple-700 bg-purple-50/30"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Overdue Coordination Tasks ({sla.overdue_tasks.length})
        </button>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {activeTab === "overdue_cases" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Case ID</th>
                  <th className="px-4 py-3">Institution</th>
                  <th className="px-4 py-3">Bureau</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Officer</th>
                  <th className="px-4 py-3">Elapsed / Due</th>
                  <th className="px-4 py-3">SLA Breach</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sla.overdue_cases.map((c) => (
                  <tr key={c.id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                      <Link to={`/cases/${encodeURIComponent(c.id)}`} className="hover:underline">
                        {c.id}
                      </Link>
                      {c.is_escalated && (
                        <span className="block text-[9px] font-bold text-rose-700 uppercase">ESCALATED</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 truncate max-w-xs">{c.institution_name}</p>
                      <span className="text-[10px] text-slate-400">ID: {c.institution_permanent_id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="bureau" value={c.assigned_bureau}>
                        {c.assigned_bureau}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="priority" value={c.priority}>
                        {c.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{c.assigned_officer_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span>{c.days_elapsed} days elapsed</span>
                      <span className="text-[10px] text-slate-400 block font-mono">Target: {c.expected_disposal_date}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-rose-700 whitespace-nowrap">
                      {Math.abs(c.days_remaining)} Days Overdue
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        to={`/cases/${encodeURIComponent(c.id)}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
                      >
                        <span>Action</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "approaching_cases" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Case ID</th>
                  <th className="px-4 py-3">Institution</th>
                  <th className="px-4 py-3">Bureau</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Officer</th>
                  <th className="px-4 py-3">Expected Disposal</th>
                  <th className="px-4 py-3">Time Remaining</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sla.approaching_cases.map((c) => (
                  <tr key={c.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                      <Link to={`/cases/${encodeURIComponent(c.id)}`} className="hover:underline">
                        {c.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 truncate max-w-xs">{c.institution_name}</p>
                      <span className="text-[10px] text-slate-400">ID: {c.institution_permanent_id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="bureau" value={c.assigned_bureau}>
                        {c.assigned_bureau}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="priority" value={c.priority}>
                        {c.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{c.assigned_officer_name}</td>
                    <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">{c.expected_disposal_date}</td>
                    <td className="px-4 py-3 font-bold text-amber-700 whitespace-nowrap">
                      {c.days_remaining} Days Remaining
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        to={`/cases/${encodeURIComponent(c.id)}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
                      >
                        <span>Expedite</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "overdue_tasks" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Task ID</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Institution</th>
                  <th className="px-4 py-3">Origin Bureau</th>
                  <th className="px-4 py-3">Lead Owner</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Overdue Delay</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sla.overdue_tasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-teal-700 whitespace-nowrap">{t.id}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{t.title}</td>
                    <td className="px-4 py-3 text-slate-700">{t.institution_name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="bureau" value={t.originating_bureau}>
                        {t.originating_bureau}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{t.assigned_owner_name}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">{t.due_date}</td>
                    <td className="px-4 py-3 font-bold text-rose-700">
                      {Math.abs(t.days_remaining)} Days Overdue
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/coordination"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
                      >
                        <span>Manage</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

