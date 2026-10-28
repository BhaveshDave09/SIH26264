import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, UserCheck, ArrowRightLeft, ArrowLeft, FileText, Upload, CheckCircle2, AlertTriangle, GitCompare, Download, History } from "lucide-react";
import {
  getCaseById,
  assignOfficer,
  transferCase,
  updateCaseStatus,
  uploadCaseDocument,
} from "../api/cases";
import { getOfficers } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { Badge } from "../components/Badge";
import { Modal } from "../components/Modal";
import { LoadingState } from "../components/LoadingState";

export const CaseDetailPage: React.FC = () => {
  const params = useParams(); const rawId = (params as any)["*"] || params.id || ""; const caseId = decodeURIComponent(rawId);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"history" | "documents" | "details">("history");

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Form states
  const [selectedOfficerId, setSelectedOfficerId] = useState<number>(0);
  const [assignRemarks, setAssignRemarks] = useState("");
  const [transferBureau, setTransferBureau] = useState("RB");
  const [transferReason, setTransferReason] = useState("");
  const [newStatus, setNewStatus] = useState("Under Process");
  const [statusRemark, setStatusRemark] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: caseItem, isLoading, error } = useQuery({
    queryKey: ["case-detail", caseId],
    queryFn: () => getCaseById(caseId),
    enabled: !!caseId,
  });

  const { data: officers = [] } = useQuery({
    queryKey: ["officers-for-case", caseItem?.assigned_bureau],
    queryFn: () => getOfficers(caseItem?.assigned_bureau),
    enabled: !!caseItem,
  });

  // Assign Mutation
  const assignMutation = useMutation({
    mutationFn: () => assignOfficer(caseId, selectedOfficerId, assignRemarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-detail", caseId] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      setShowAssignModal(false);
      setAssignRemarks("");
    },
    onError: (err: any) => setActionError(err.message),
  });

  // Transfer Mutation
  const transferMutation = useMutation({
    mutationFn: () => transferCase(caseId, transferBureau, transferReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-detail", caseId] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      setShowTransferModal(false);
      setTransferReason("");
    },
    onError: (err: any) => setActionError(err.message),
  });

  // Status Mutation
  const statusMutation = useMutation({
    mutationFn: () => updateCaseStatus(caseId, newStatus, statusRemark, nextAction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-detail", caseId] });
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      setShowStatusModal(false);
      setStatusRemark("");
      setNextAction("");
    },
    onError: (err: any) => setActionError(err.message),
  });

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!uploadFile) throw new Error("Please select a file to upload");
      return uploadCaseDocument(caseId, uploadFile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-detail", caseId] });
      setShowUploadModal(false);
      setUploadFile(null);
    },
    onError: (err: any) => setActionError(err.message),
  });

  if (isLoading) return <LoadingState message="Fetching case files and audit timeline..." />;
  if (error || !caseItem) {
    return (
      <div className="p-8 text-center text-rose-600 bg-rose-50 border border-rose-200 rounded-xl my-6">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
        <h3 className="font-bold">Case Record Not Found</h3>
        <p className="text-xs text-rose-500 mt-1">{String(error)}</p>
        <Link to="/cases" className="mt-4 inline-block text-xs font-semibold text-blue-700 hover:underline">
          &larr; Return to Cases Management
        </Link>
      </div>
    );
  }

  const isReadOnly = user?.role === "READ_ONLY";

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <Link
          to="/cases"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Cases</span>
        </Link>

        <div className="flex items-center gap-2">
          <Badge variant="bureau" value={caseItem.assigned_bureau}>
            {caseItem.assigned_bureau}
          </Badge>
          <Badge variant="status" value={caseItem.status}>
            {caseItem.status}
          </Badge>
          <Badge variant="priority" value={caseItem.priority}>
            {caseItem.priority}
          </Badge>
        </div>
      </div>

      {/* Cross-Bureau Overlap Alert Banner (PRIMARY USP CALLOUT) */}
      {caseItem.has_potential_overlap && (
        <div className="p-4 bg-linear-to-r from-purple-900 to-indigo-900 text-white rounded-xl shadow-md border border-purple-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600/40 border border-purple-400/40 rounded-xl text-teal-300 shrink-0">
              <GitCompare className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-400 text-slate-900 uppercase">
                  CROSS-BUREAU CASE INTELLIGENCE
                </span>
                <span className="text-xs font-semibold text-purple-200">
                  {caseItem.overlap_count} Potential Correlation(s) Detected
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                Potential Overlapping Cases — Coordination Required
              </h3>
              <p className="text-xs text-purple-200 mt-0.5 max-w-2xl">
                The NivaranX engine identified that another Bureau is investigating related compliance/grievance matters for {caseItem.institution_name}.
              </p>
            </div>
          </div>
          <Link
            to={`/intelligence?case_id=${encodeURIComponent(caseItem.id)}`}
            className="px-4 py-2 bg-teal-400 hover:bg-teal-300 text-slate-900 text-xs font-bold rounded-lg shadow-sm transition-all whitespace-nowrap"
          >
            Examine Matching Explanation &rarr;
          </Link>
        </div>
      )}

      {/* Case Header Details Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                {caseItem.id}
              </span>
              <span className="text-xs text-slate-500">
                Lodged on {caseItem.received_date} via {caseItem.complainant_type}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-2">{caseItem.title}</h1>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">{caseItem.description}</p>
          </div>

          {/* Action Buttons Toolbar */}
          {!isReadOnly && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={() => {
                  setActionError(null);
                  setSelectedOfficerId(caseItem.assigned_officer_id || officers[0]?.id || 0);
                  setShowAssignModal(true);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Assign Officer</span>
              </button>

              <button
                onClick={() => {
                  setActionError(null);
                  setShowTransferModal(true);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-purple-600" />
                <span>Transfer Bureau</span>
              </button>

              <button
                onClick={() => {
                  setActionError(null);
                  setNewStatus(caseItem.status);
                  setShowStatusModal(true);
                }}
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Update Status</span>
              </button>

              <button
                onClick={() => {
                  setActionError(null);
                  setShowUploadModal(true);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-teal-600" />
                <span>Attach Evidence</span>
              </button>
            </div>
          )}
        </div>

        {/* Operational Metadata Badges Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 block font-semibold text-[10px] uppercase">Institution</span>
            <Link
              to={`/institutions/${caseItem.institution_id}`}
              className="font-bold text-slate-900 hover:text-blue-700 hover:underline flex items-center gap-1 mt-0.5"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate">{caseItem.institution_name}</span>
            </Link>
            <span className="text-[10px] text-slate-500 font-mono">
              AICTE ID: {caseItem.institution_permanent_id}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block font-semibold text-[10px] uppercase">Assigned Officer</span>
            <p className="font-semibold text-slate-900 mt-0.5">
              {caseItem.assigned_officer_name || <span className="text-slate-400 italic">Unassigned</span>}
            </p>
            <span className="text-[10px] text-slate-500">{caseItem.assigned_bureau} Cell</span>
          </div>

          <div>
            <span className="text-slate-400 block font-semibold text-[10px] uppercase">SLA Disposal Target</span>
            <p className="font-semibold text-slate-900 mt-0.5 font-mono">{caseItem.expected_disposal_date}</p>
            {new Date(caseItem.expected_disposal_date) < new Date() && !["Disposed", "Closed"].includes(caseItem.status) ? (
              <span className="text-[10px] text-rose-600 font-bold block animate-pulse">BREACHED OVERDUE</span>
            ) : (
              <span className="text-[10px] text-emerald-600 font-medium">Within statutory timeframe</span>
            )}
          </div>

          <div>
            <span className="text-slate-400 block font-semibold text-[10px] uppercase">Next Step Required</span>
            <p className="font-medium text-slate-800 mt-0.5 truncate">{caseItem.next_action_required || "Pending allocation"}</p>
            <span className="text-[10px] text-slate-400">Last Action: {caseItem.last_action}</span>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === "history"
              ? "border-blue-600 text-blue-700 bg-blue-50/30"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Case History & Audit Timeline ({caseItem.history?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("documents")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === "documents"
              ? "border-blue-600 text-blue-700 bg-blue-50/30"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Supporting Documents ({caseItem.documents?.length || 0})</span>
        </button>
      </div>

      {/* Tab Content: History & Audit Timeline */}
      {activeTab === "history" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="space-y-6 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200">
            {caseItem.history && caseItem.history.length > 0 ? (
              caseItem.history.map((h) => (
                <div key={h.id} className="relative flex items-start gap-4 pl-8 text-xs">
                  <div className="absolute left-1.5 -translate-x-1/2 top-1 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
                  <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">@{h.actor_username}</span>
                        <Badge variant="neutral" className="text-[10px]">
                          {h.action_type}
                        </Badge>
                        {h.new_status && (
                          <span className="text-slate-500 text-[11px]">
                            Status: <span className="font-semibold text-slate-800">{h.new_status}</span>
                          </span>
                        )}
                        {h.new_bureau && (
                          <span className="text-slate-500 text-[11px]">
                            Bureau: <span className="font-semibold text-slate-800">{h.new_bureau}</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(h.timestamp).toUTCString()}
                      </span>
                    </div>
                    <p className="text-slate-700 text-xs mt-1 leading-relaxed">{h.remarks}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No history records logged.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Supporting Documents */}
      {activeTab === "documents" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Secure Document Attachments & Evidentiary Records
            </h3>
            {!isReadOnly && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-3 py-1.5 bg-blue-700 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Attachment</span>
              </button>
            )}
          </div>

          {caseItem.documents && caseItem.documents.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {caseItem.documents.map((doc) => (
                <div key={doc.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{doc.original_filename}</p>
                      <p className="text-[10px] text-slate-400">
                        {Math.round(doc.file_size_bytes / 1024)} KB &bull; Uploaded by @{doc.uploaded_by_username} on{" "}
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <a
                    href={`/api/v1/documents/${doc.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg flex items-center gap-1 font-semibold text-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-8 text-center">
              No documents uploaded yet. Authorized officials can attach PDF, DOCX, or evidentiary images.
            </p>
          )}
        </div>
      )}

      {/* Assign Officer Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Investigating Officer"
        description="Allocate case responsibility to an authorized official within this Bureau"
      >
        <div className="space-y-4 text-xs">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
              {actionError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Officer *</label>
            <select
              value={selectedOfficerId}
              onChange={(e) => setSelectedOfficerId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            >
              {officers.map((off) => (
                <option key={off.id} value={off.id}>
                  {off.full_name} (@{off.username}) &bull; {off.role.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Assignment Remarks / Instructions *</label>
            <textarea
              rows={3}
              required
              placeholder="Provide specific directives for evidence gathering and site visit..."
              value={assignRemarks}
              onChange={(e) => setAssignRemarks(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              onClick={() => setShowAssignModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={assignMutation.isPending || !assignRemarks.trim()}
              onClick={() => assignMutation.mutate()}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold cursor-pointer disabled:opacity-50"
            >
              {assignMutation.isPending ? "Assigning..." : "Confirm Officer Assignment"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Transfer Bureau Modal */}
      <Modal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title="Inter-Bureau Case Transfer"
        description="Transfer case jurisdiction to another AICTE Bureau with mandatory statutory justification"
      >
        <div className="space-y-4 text-xs">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
              {actionError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target AICTE Bureau / Cell *</label>
            <select
              value={transferBureau}
              onChange={(e) => setTransferBureau(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            >
              <option value="RB">Regulation Bureau (RB)</option>
              <option value="PGRC">Public Grievance Redressal Cell (PGRC)</option>
              <option value="APPROVAL_BUREAU">Approval Bureau</option>
              <option value="FINANCE_BUREAU">Finance Bureau</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Mandatory Inter-Bureau Transfer Reason *
            </label>
            <textarea
              rows={3}
              required
              placeholder="State the regulatory jurisdiction basis for transferring this matter (e.g. requires forensic audit of trust books)..."
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              onClick={() => setShowTransferModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={transferMutation.isPending || transferReason.trim().length < 5}
              onClick={() => transferMutation.mutate()}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-semibold cursor-pointer disabled:opacity-50"
            >
              {transferMutation.isPending ? "Transferring..." : "Execute Case Transfer"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Update Status Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Update Case Progression Status"
        description="Advance the case along the legal AICTE complaint lifecycle with mandatory remarks"
      >
        <div className="space-y-4 text-xs">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
              {actionError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">New Workflow Status *</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            >
              <option value="Received">Received</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Under Process">Under Process</option>
              <option value="Escalated">Escalated</option>
              <option value="Disposed">Disposed / Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Mandatory Action Remark / Decision Minutes *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Detail the official proceedings, hearing outcome, or explanation for this status update..."
              value={statusRemark}
              onChange={(e) => setStatusRemark(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Next Action Required</label>
            <input
              type="text"
              placeholder="e.g. Awaiting management compliance report by 2026-11-15"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              onClick={() => setShowStatusModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={statusMutation.isPending || statusRemark.trim().length < 3}
              onClick={() => statusMutation.mutate()}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold cursor-pointer disabled:opacity-50"
            >
              {statusMutation.isPending ? "Updating..." : "Commit Status Change"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Upload Document Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Supporting Document"
        description="Attach PDF, Word, or image evidence. Enforces file-type whitelisting and path traversal protection."
      >
        <div className="space-y-4 text-xs">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
              {actionError}
            </div>
          )}

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <input
              type="file"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-[10px] text-slate-400 mt-2">
              Allowed: PDF, DOCX, JPG, PNG, TXT up to 10MB. Stored outside public web assets.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              onClick={() => setShowUploadModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={uploadMutation.isPending || !uploadFile}
              onClick={() => uploadMutation.mutate()}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold cursor-pointer disabled:opacity-50"
            >
              {uploadMutation.isPending ? "Uploading..." : "Upload Document"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};


