import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  GitCompare,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Filter,
  CheckSquare,
  XSquare,
  HelpCircle,
  Play,
  RotateCw,
} from "lucide-react";
import {
  getRelationships,
  reviewRelationship,
  triggerIntelligenceScan,
  CaseRelationshipItem,
  ReviewRelationshipPayload,
} from "../api/intelligence";
import { getOfficers } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { Badge } from "../components/Badge";
import { Modal } from "../components/Modal";
import { LoadingState } from "../components/LoadingState";
import { EmptyState } from "../components/EmptyState";

export const IntelligencePage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const filterStatus = searchParams.get("status") || "ALL";
  const caseIdParam = searchParams.get("case_id") || undefined;
  const instIdParam = searchParams.get("institution_id") ? Number(searchParams.get("institution_id")) : undefined;

  const [activeFilter, setActiveFilter] = useState<string>(filterStatus);
  const [selectedRel, setSelectedRel] = useState<CaseRelationshipItem | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Review form
  const [decision, setDecision] = useState<"CONFIRMED_RELATED" | "MARKED_DUPLICATE" | "DISMISSED" | "COORDINATION_FLAGGED">(
    "CONFIRMED_RELATED"
  );
  const [reason, setReason] = useState("");
  const [createCoordTask, setCreateCoordTask] = useState(true);
  const [taskOwnerId, setTaskOwnerId] = useState<number>(user?.id || 1);
  const [taskDueDays, setTaskDueDays] = useState<number>(14);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Scan state
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const { data: officers = [] } = useQuery({
    queryKey: ["officers-list"],
    queryFn: () => getOfficers(),
  });

  const { data: relationships = [], isLoading, error } = useQuery({
    queryKey: ["relationships", activeFilter, caseIdParam, instIdParam],
    queryFn: () =>
      getRelationships({
        status: activeFilter !== "ALL" ? activeFilter : undefined,
        case_id: caseIdParam,
        institution_id: instIdParam,
      }),
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: ReviewRelationshipPayload) => {
      if (!selectedRel) throw new Error("No relationship selected");
      return reviewRelationship(selectedRel.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["coordination-tasks"] });
      setShowReviewModal(false);
      setReason("");
      setSelectedRel(null);
    },
    onError: (err: any) => {
      setReviewError(err.message || "Failed to submit review decision.");
    },
  });

  const scanMutation = useMutation({
    mutationFn: triggerIntelligenceScan,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setScanMessage(data.message);
      setTimeout(() => setScanMessage(null), 6000);
    },
  });

  const handleOpenReview = (rel: CaseRelationshipItem) => {
    setSelectedRel(rel);
    setDecision(
      rel.relationship_type === "POTENTIAL_DUPLICATE"
        ? "MARKED_DUPLICATE"
        : rel.relationship_type === "ACTION_CONFLICT"
        ? "COORDINATION_FLAGGED"
        : "CONFIRMED_RELATED"
    );
    setReason("");
    setCreateCoordTask(true);
    setReviewError(null);
    setShowReviewModal(true);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError(null);
    reviewMutation.mutate({
      decision,
      reason,
      create_coordination_task: createCoordTask,
      task_owner_id: taskOwnerId,
      task_due_days: taskDueDays,
    });
  };

  const pendingCount = relationships.filter((r) => r.status === "DETECTED").length;
  const isReadOnly = user?.role === "READ_ONLY";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Cross-Bureau Case Intelligence Engine
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-800 border border-teal-500/30">
              PRIMARY USP
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Explainable AI & multi-signal case relationship detection: linking AICTE Permanent IDs, RapidFuzz lexical matching, and conflicting regulatory actions
          </p>
        </div>

        {!isReadOnly && (
          <button
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer self-start md:self-auto disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${scanMutation.isPending ? "animate-spin" : ""}`} />
            <span>{scanMutation.isPending ? "Scanning Active Cases..." : "Trigger Full System Scan"}</span>
          </button>
        )}
      </div>

      {scanMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{scanMessage}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
        {[
          { key: "ALL", label: "All Overlaps" },
          { key: "DETECTED", label: `Pending Review (${pendingCount})` },
          { key: "CONFIRMED_RELATED", label: "Confirmed Related" },
          { key: "MARKED_DUPLICATE", label: "Marked Duplicate" },
          { key: "COORDINATION_FLAGGED", label: "Coordination Flagged" },
          { key: "DISMISSED", label: "Dismissed" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeFilter === tab.key
                ? "bg-blue-700 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Relationships Grid */}
      {isLoading ? (
        <LoadingState message="Analyzing cross-bureau correlations and matching signals..." />
      ) : error ? (
        <div className="p-8 text-center text-rose-600 bg-rose-50 border border-rose-200 rounded-xl">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
          <p className="text-sm font-semibold">Failed to load case relationships</p>
          <p className="text-xs text-rose-500 mt-1">{String(error)}</p>
        </div>
      ) : relationships.length === 0 ? (
        <EmptyState
          title="No candidate relationships found"
          description="The NivaranX cross-bureau engine has not detected unexamined overlaps for this filter."
          icon={<GitCompare className="w-8 h-8 text-slate-400" />}
        />
      ) : (
        <div className="space-y-4">
          {relationships.map((rel) => {
            const isConflict = rel.relationship_type === "ACTION_CONFLICT";
            const isDuplicate = rel.relationship_type === "POTENTIAL_DUPLICATE";

            return (
              <div
                key={rel.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-all ${
                  isConflict
                    ? "border-rose-300 ring-1 ring-rose-100"
                    : isDuplicate
                    ? "border-purple-300 ring-1 ring-purple-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Header Banner */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <Badge variant="relationship" value={rel.relationship_type}>
                      {rel.relationship_type.replace(/_/g, " ")}
                    </Badge>
                    <span className="font-semibold text-xs text-slate-700">
                      Correlation Score: <span className="font-bold text-blue-700">{Math.round(rel.similarity_score * 100)}%</span>
                    </span>
                    <span className="text-[11px] text-slate-400">&bull;</span>
                    <span className="text-xs text-slate-600">
                      Status: <span className="font-semibold">{rel.status.replace(/_/g, " ")}</span>
                    </span>
                  </div>

                  {!isReadOnly && rel.status === "DETECTED" && (
                    <button
                      onClick={() => handleOpenReview(rel)}
                      className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start md:self-auto"
                    >
                      Official Review Decision &rarr;
                    </button>
                  )}
                </div>

                {/* Institution Bar */}
                <div className="py-2.5 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <Link
                      to={`/institutions/${rel.institution_id}`}
                      className="font-bold text-slate-900 hover:text-blue-700 hover:underline"
                    >
                      {rel.institution_name}
                    </Link>
                    <span className="font-mono text-slate-400 text-[11px]">
                      (AICTE ID: {rel.institution_permanent_id})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Detected: {new Date(rel.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Side-by-Side Comparison Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-3">
                  {/* Case 1 */}
                  <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-700">{rel.case_id_1}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="bureau" value={rel.case_1_bureau}>
                          {rel.case_1_bureau}
                        </Badge>
                        <Badge variant="status" value={rel.case_1_status}>
                          {rel.case_1_status}
                        </Badge>
                      </div>
                    </div>
                    <Link
                      to={`/cases/${encodeURIComponent(rel.case_id_1)}`}
                      className="text-xs font-bold text-slate-900 hover:text-blue-700 hover:underline block truncate"
                    >
                      {rel.case_1_title}
                    </Link>
                    <p className="text-[11px] text-slate-500">Category: {rel.case_1_category}</p>
                  </div>

                  {/* Case 2 */}
                  <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-700">{rel.case_id_2}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="bureau" value={rel.case_2_bureau}>
                          {rel.case_2_bureau}
                        </Badge>
                        <Badge variant="status" value={rel.case_2_status}>
                          {rel.case_2_status}
                        </Badge>
                      </div>
                    </div>
                    <Link
                      to={`/cases/${encodeURIComponent(rel.case_id_2)}`}
                      className="text-xs font-bold text-slate-900 hover:text-blue-700 hover:underline block truncate"
                    >
                      {rel.case_2_title}
                    </Link>
                    <p className="text-[11px] text-slate-500">Category: {rel.case_2_category}</p>
                  </div>
                </div>

                {/* Matching Signals Breakdown */}
                <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-200/60 my-2 space-y-1 text-xs">
                  <span className="font-bold text-blue-900 text-[11px] uppercase tracking-wider block">
                    Verified Matching Signals &amp; Evidence:
                  </span>
                  <ul className="space-y-1">
                    {rel.matching_signals.map((sig, sIdx) => (
                      <li key={sIdx} className="text-slate-700 flex items-start gap-1.5 text-xs">
                        <span className="text-blue-600 font-bold">&bull;</span>
                        <span>{sig}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Explanation & Recommended Action */}
                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <p className="text-slate-700 leading-relaxed font-medium">
                    <span className="font-bold text-slate-900">NivaranX Explanation:</span> {rel.explanation}
                  </p>
                  <p className="text-blue-950 font-semibold pt-1">
                    <span className="text-slate-900 font-bold">Recommended Action:</span> {rel.recommended_action}
                  </p>
                </div>

                {/* Review Audit Record (if already reviewed) */}
                {rel.reviewed_by && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Reviewed by <span className="font-bold text-slate-800">@{rel.reviewed_by}</span> on{" "}
                      {rel.reviewed_at ? new Date(rel.reviewed_at).toLocaleDateString() : ""}
                    </span>
                    <span className="italic max-w-md truncate">Reason: {rel.review_decision_reason}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review Decision Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Official Human-in-the-Loop Review Decision"
        description="Verify or dismiss the cross-bureau correlation candidate with mandatory reasoning"
        maxWidth="xl"
      >
        {selectedRel && (
          <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
            {reviewError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
                {reviewError}
              </div>
            )}

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="font-bold text-slate-900">Comparing:</span>
              <p className="font-mono text-blue-700 mt-0.5">
                {selectedRel.case_id_1} ({selectedRel.case_1_bureau}) &harr; {selectedRel.case_id_2} ({selectedRel.case_2_bureau})
              </p>
              <p className="text-slate-600 text-[11px] mt-1">{selectedRel.institution_name}</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Decision *</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "CONFIRMED_RELATED", label: "Confirm Related Case", desc: "Link matters across Bureaus" },
                  { id: "COORDINATION_FLAGGED", label: "Flag for Coordination", desc: "Require joint bureau task" },
                  { id: "MARKED_DUPLICATE", label: "Mark as Duplicate", desc: "Redundant grievance filing" },
                  { id: "DISMISSED", label: "Dismiss as Unrelated", desc: "False positive correlation" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDecision(opt.id as any)}
                    className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      decision === opt.id
                        ? "bg-blue-50 border-blue-600 text-blue-900 font-bold"
                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <p className="text-xs">{opt.label}</p>
                    <p className="text-[10px] text-slate-400 font-normal">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mandatory Decision Justification / Minutes *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Explain the regulatory reasoning for this decision (recorded in immutable audit trail)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
            </div>

            {/* Coordination Task Auto-Creation Option */}
            <div className="p-3 bg-teal-50/60 border border-teal-200 rounded-xl space-y-3">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-teal-900">
                <input
                  type="checkbox"
                  checked={createCoordTask}
                  onChange={(e) => setCreateCoordTask(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <span>Automatically Create Inter-Bureau Coordination Task in Coordination Center</span>
              </label>

              {createCoordTask && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-teal-200/60">
                  <div>
                    <label className="block font-semibold text-teal-950 mb-1">Assign Task Owner</label>
                    <select
                      value={taskOwnerId}
                      onChange={(e) => setTaskOwnerId(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-teal-300 rounded-lg bg-white text-xs"
                    >
                      {officers.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.full_name} ({o.bureau})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-teal-950 mb-1">Target Due Days</label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={taskDueDays}
                      onChange={(e) => setTaskDueDays(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-teal-300 rounded-lg bg-white text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reviewMutation.isPending || reason.trim().length < 3}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold cursor-pointer disabled:opacity-50"
              >
                {reviewMutation.isPending ? "Recording Decision..." : "Commit Official Decision"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
