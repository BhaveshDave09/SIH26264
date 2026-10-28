import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, GitCompare, ArrowLeft, ExternalLink, AlertTriangle } from "lucide-react";
import { getInstitution360 } from "../api/institutions";
import { getCases } from "../api/cases";
import { getCoordinationTasks } from "../api/coordination";
import { getRelationships } from "../api/intelligence";
import { Badge } from "../components/Badge";
import { LoadingState } from "../components/LoadingState";

export const InstitutionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const institutionId = Number(id);

  const { data: inst, isLoading: loadingInst, error: errInst } = useQuery({
    queryKey: ["institution-360", institutionId],
    queryFn: () => getInstitution360(institutionId),
    enabled: !isNaN(institutionId),
  });

  const { data: casesData } = useQuery({
    queryKey: ["institution-cases", institutionId],
    queryFn: () => getCases({ institution_id: institutionId, page_size: 50 }),
    enabled: !isNaN(institutionId),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["institution-tasks", institutionId],
    queryFn: () => getCoordinationTasks({ institution_id: institutionId }),
    enabled: !isNaN(institutionId),
  });

  const { data: relationships = [] } = useQuery({
    queryKey: ["institution-relationships", institutionId],
    queryFn: () => getRelationships({ institution_id: institutionId }),
    enabled: !isNaN(institutionId),
  });

  if (loadingInst) return <LoadingState message="Compiling Institution 360° Profile..." />;
  if (errInst || !inst) {
    return (
      <div className="p-8 text-center text-rose-600 bg-rose-50 border border-rose-200 rounded-xl">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
        <h3 className="font-bold">Institution Profile Not Found</h3>
        <p className="text-xs text-rose-500 mt-1">{String(errInst)}</p>
        <Link to="/institutions" className="mt-4 inline-block text-xs font-semibold text-blue-700 hover:underline">
          ← Back to Institutions Directory
        </Link>
      </div>
    );
  }

  const cases = casesData?.items || [];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <Link
          to="/institutions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Institutions Directory</span>
        </Link>

        <span className="text-xs text-slate-400 font-mono">Internal ID: #{inst.id}</span>
      </div>

      {/* Institution Hero Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-100 text-blue-800 border border-blue-200">
              AICTE ID: {inst.permanent_id}
            </span>
            <Badge variant="neutral" className="bg-slate-100 text-slate-700 font-medium">
              {inst.category}
            </Badge>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                inst.status === "Active"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : inst.status === "Under Scrutiny"
                  ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {inst.status}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{inst.name}</h1>

          <p className="text-xs text-slate-600 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              {inst.address}, {inst.state} ({inst.region} Region)
            </span>
          </p>

          {inst.aliases && inst.aliases.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] font-semibold text-slate-400">Recognized Aliases:</span>
              {inst.aliases.map((a) => (
                <span
                  key={a.id}
                  className="px-2 py-0.5 bg-slate-50 text-slate-600 rounded text-xs border border-slate-200 font-medium"
                >
                  {a.alias_name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 360 Summary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto shrink-0 text-center">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Total Cases</span>
            <p className="text-xl font-bold text-slate-900 mt-1">{inst.total_cases}</p>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="text-[10px] text-amber-700 font-bold uppercase">Active Pending</span>
            <p className="text-xl font-bold text-amber-700 mt-1">
              {(inst.cases_by_status["Under Process"] || 0) + (inst.cases_by_status["Received"] || 0)}
            </p>
          </div>
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
            <span className="text-[10px] text-purple-700 font-bold uppercase">Overlap Alerts</span>
            <p className="text-xl font-bold text-purple-700 mt-1">{inst.overlap_alerts_count}</p>
          </div>
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
            <span className="text-[10px] text-teal-700 font-bold uppercase">Coordination Tasks</span>
            <p className="text-xl font-bold text-teal-700 mt-1">{inst.active_coordination_count}</p>
          </div>
        </div>
      </div>

      {/* Bureau Distribution & Overlap Banner */}
      {inst.overlap_alerts_count > 0 && (
        <div className="p-4 bg-linear-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-purple-600 text-white rounded-lg">
              <GitCompare className="w-5 h-5" />
            </span>
            <div>
              <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                Cross-Bureau Case Intelligence Alert
              </h4>
              <p className="text-xs text-purple-800 mt-0.5">
                Multiple bureaus are concurrently processing complaints related to {inst.name}.
              </p>
            </div>
          </div>
          <Link
            to={`/intelligence?institution_id=${inst.id}`}
            className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors whitespace-nowrap"
          >
            Review Overlap Explanations →
          </Link>
        </div>
      )}

      {/* Tabs: Cases, Coordination Tasks, Overlaps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Related Cases List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Associated Complaints & Cases ({cases.length})
                </h3>
                <p className="text-xs text-slate-500">
                  All cases linked via AICTE Permanent ID: {inst.permanent_id}
                </p>
              </div>
              <Link
                to={`/cases?institution_id=${inst.id}`}
                className="text-xs font-semibold text-blue-700 hover:underline"
              >
                Open in Cases Explorer →
              </Link>
            </div>

            {cases.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No cases lodged for this institution.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {cases.map((c) => (
                  <div key={c.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-700">{c.id}</span>
                        <Badge variant="bureau" value={c.assigned_bureau}>
                          {c.assigned_bureau}
                        </Badge>
                        <Badge variant="status" value={c.status}>
                          {c.status}
                        </Badge>
                        <Badge variant="priority" value={c.priority}>
                          {c.priority}
                        </Badge>
                        {c.has_potential_overlap && (
                          <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded text-[10px] font-bold border border-purple-200">
                            CROSS-BUREAU LINK
                          </span>
                        )}
                      </div>
                      <Link
                        to={`/cases/${encodeURIComponent(c.id)}`}
                        className="text-xs font-bold text-slate-900 hover:text-blue-700 block truncate"
                      >
                        {c.title}
                      </Link>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{c.description}</p>
                      <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-0.5">
                        <span>Category: {c.category}</span>
                        <span>Lodged: {c.received_date}</span>
                        <span>Officer: {c.assigned_officer_name || "Unassigned"}</span>
                      </div>
                    </div>

                    <Link
                      to={`/cases/${encodeURIComponent(c.id)}`}
                      className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Coordination Tasks & Overlap Candidates (1 col) */}
        <div className="space-y-4">
          {/* Active Coordination Tasks */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
              Coordination Tasks ({tasks.length})
            </h3>
            <p className="text-xs text-slate-500 mb-4">Inter-bureau joint actions on this institution</p>

            {tasks.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No coordination tasks active.</p>
            ) : (
              <div className="space-y-3">
                {tasks.map((t) => (
                  <div key={t.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-teal-700">{t.id}</span>
                      <Badge variant="status" value={t.status}>
                        {t.status}
                      </Badge>
                    </div>
                    <p className="text-xs font-semibold text-slate-900">{t.title}</p>
                    <div className="text-[10px] text-slate-500 flex items-center justify-between">
                      <span>Owner: {t.assigned_owner_name}</span>
                      <span>Due: {t.due_date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Overlap Intelligence Breakdown */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-1">
              Cross-Bureau Relationships ({relationships.length})
            </h3>
            <p className="text-xs text-slate-500 mb-4">Autonomous detection matches</p>

            {relationships.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No candidate relationships detected.</p>
            ) : (
              <div className="space-y-3">
                {relationships.map((r) => (
                  <div key={r.id} className="p-3 bg-purple-50/40 border border-purple-200 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-purple-900 uppercase">
                        {r.relationship_type.replace("_", " ")}
                      </span>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                        Score: {Math.round(r.similarity_score * 100)}%
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-800">
                      {r.case_id_1} &harr; {r.case_id_2}
                    </p>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{r.explanation}</p>
                    <Link
                      to={`/intelligence?rel_id=${r.id}`}
                      className="text-[11px] font-semibold text-blue-700 hover:underline block pt-1"
                    >
                      Examine Match Details & Decision &rarr;
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

