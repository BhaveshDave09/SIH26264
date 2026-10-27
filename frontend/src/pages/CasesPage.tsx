import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  Plus,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { getCases, createCase, CreateCasePayload, CaseFilterParams } from "../api/cases";
import { getInstitutions } from "../api/institutions";
import { getOfficers } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { Badge } from "../components/Badge";
import { Modal } from "../components/Modal";
import { LoadingState } from "../components/LoadingState";
import { EmptyState } from "../components/EmptyState";

export const CasesPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter states
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [bureau, setBureau] = useState(searchParams.get("bureau") || "ALL");
  const [status, setStatus] = useState(searchParams.get("status") || "ALL");
  const [priority, setPriority] = useState(searchParams.get("priority") || "ALL");
  const [category, setCategory] = useState(searchParams.get("category") || "ALL");
  const [isOverdueOnly, setIsOverdueOnly] = useState(false);
  const [hasOverlapOnly, setHasOverlapOnly] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Create Case Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCase, setNewCase] = useState<CreateCasePayload>({
    institution_id: 1,
    complainant_name: "",
    complainant_type: "Student",
    title: "",
    description: "",
    category: "Fee Overcharging",
    priority: "Medium",
    assigned_bureau: user?.bureau !== "ALL" ? user?.bureau || "RB" : "RB",
    expected_disposal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    next_action_required: "Initial scrutiny of complaint materials",
  });
  const [createError, setCreateError] = useState<string | null>(null);

  // Fetch institutions for dropdown
  const { data: institutions = [] } = useQuery({
    queryKey: ["institutions-dropdown"],
    queryFn: () => getInstitutions(),
  });

  // Fetch officers for dropdown
  const { data: officers = [] } = useQuery({
    queryKey: ["officers-dropdown", newCase.assigned_bureau],
    queryFn: () => getOfficers(newCase.assigned_bureau),
  });

  const queryFilters: CaseFilterParams = {
    q: search || undefined,
    bureau: bureau !== "ALL" ? bureau : undefined,
    status: status !== "ALL" ? status : undefined,
    priority: priority !== "ALL" ? priority : undefined,
    category: category !== "ALL" ? category : undefined,
    is_overdue: isOverdueOnly ? true : undefined,
    has_overlap: hasOverlapOnly ? true : undefined,
    page,
    page_size: pageSize,
  };

  const { data: casesData, isLoading, error } = useQuery({
    queryKey: ["cases", queryFilters],
    queryFn: () => getCases(queryFilters),
  });

  const createMutation = useMutation({
    mutationFn: createCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setShowCreateModal(false);
      setCreateError(null);
      // Reset form
      setNewCase({
        institution_id: institutions[0]?.id || 1,
        complainant_name: "",
        complainant_type: "Student",
        title: "",
        description: "",
        category: "Fee Overcharging",
        priority: "Medium",
        assigned_bureau: user?.bureau !== "ALL" ? user?.bureau || "RB" : "RB",
        expected_disposal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        next_action_required: "Initial scrutiny",
      });
    },
    onError: (err: any) => {
      setCreateError(err.message || "Failed to create complaint case.");
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    createMutation.mutate(newCase);
  };

  const handleClearFilters = () => {
    setSearch("");
    setBureau("ALL");
    setStatus("ALL");
    setPriority("ALL");
    setCategory("ALL");
    setIsOverdueOnly(false);
    setHasOverlapOnly(false);
    setPage(1);
    setSearchParams({});
  };

  const cases = casesData?.items || [];
  const total = casesData?.total || 0;
  const totalPages = casesData?.total_pages || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Complaints & Cases Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralized registry across Regulation Bureau (RB), Public Grievance Redressal Cell (PGRC), and Cells
          </p>
        </div>

        {user?.role !== "READ_ONLY" && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Lodge New Complaint</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Case ID (AICTE/RB/2026/...), Title, or Institution..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900"
          />
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={bureau}
            onChange={(e) => {
              setBureau(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
          >
            <option value="ALL">All Bureaus</option>
            <option value="RB">Regulation Bureau (RB)</option>
            <option value="PGRC">Public Grievance Redressal Cell</option>
            <option value="APPROVAL_BUREAU">Approval Bureau</option>
            <option value="FINANCE_BUREAU">Finance Bureau</option>
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
          >
            <option value="ALL">All Statuses</option>
            <option value="Received">Received</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Under Process">Under Process</option>
            <option value="Transferred">Transferred</option>
            <option value="Escalated">Escalated</option>
            <option value="Disposed">Disposed</option>
          </select>

          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
          >
            <option value="ALL">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
          >
            <option value="ALL">All Categories</option>
            <option value="Fee Overcharging">Fee Overcharging</option>
            <option value="Unapproved Courses">Unapproved Courses</option>
            <option value="Faculty Exploitation">Faculty Exploitation</option>
            <option value="Infrastructure Deficit">Infrastructure Deficit</option>
            <option value="Admission Irregularity">Admission Irregularity</option>
            <option value="Ragging & Safety">Ragging & Safety</option>
            <option value="Harassment">Harassment</option>
          </select>

          {/* Quick Toggles */}
          <button
            type="button"
            onClick={() => {
              setIsOverdueOnly(!isOverdueOnly);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              isOverdueOnly
                ? "bg-rose-100 text-rose-800 border-rose-300"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Overdue SLA Only
          </button>

          <button
            type="button"
            onClick={() => {
              setHasOverlapOnly(!hasOverlapOnly);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              hasOverlapOnly
                ? "bg-purple-100 text-purple-800 border-purple-300"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Has Overlap Alert Only
          </button>

          {(search ||
            bureau !== "ALL" ||
            status !== "ALL" ||
            priority !== "ALL" ||
            category !== "ALL" ||
            isOverdueOnly ||
            hasOverlapOnly) && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-blue-700 hover:underline font-semibold ml-auto"
            >
              Clear All Filters
            </button>
          )}
        </div>
      </div>

      {/* Cases Table */}
      {isLoading ? (
        <LoadingState message="Loading case records from database..." />
      ) : error ? (
        <div className="p-8 text-center text-rose-600 bg-rose-50 border border-rose-200 rounded-xl">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
          <p className="text-sm font-semibold">Failed to fetch cases</p>
          <p className="text-xs text-rose-500 mt-1">{String(error)}</p>
        </div>
      ) : cases.length === 0 ? (
        <EmptyState
          title="No cases matching criteria"
          description="Try adjusting your search terms or clearing the bureau/status filters."
          actionLabel="Clear Filters"
          onAction={handleClearFilters}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Case ID</th>
                  <th className="px-4 py-3">Institution & Location</th>
                  <th className="px-4 py-3">Complaint Title & Category</th>
                  <th className="px-4 py-3">Bureau</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Officer</th>
                  <th className="px-4 py-3">Disposal Target</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold whitespace-nowrap">
                      <Link to={`/cases/${encodeURIComponent(c.id)}`} className="text-blue-700 hover:underline">
                        {c.id}
                      </Link>
                      {c.has_potential_overlap && (
                        <div className="mt-1">
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200 tracking-tight">
                            OVERLAP ({c.overlap_count})
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/institutions/${c.institution_id}`}
                        className="font-medium text-slate-900 hover:text-blue-700 hover:underline block truncate max-w-xs"
                      >
                        {c.institution_name}
                      </Link>
                      <span className="text-[10px] text-slate-400 block">
                        ID: {c.institution_permanent_id} &bull; {c.institution_state}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/cases/${encodeURIComponent(c.id)}`}
                        className="font-semibold text-slate-900 hover:text-blue-700 hover:underline block truncate max-w-sm"
                      >
                        {c.title}
                      </Link>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>{c.category}</span>
                        <span>&bull;</span>
                        <span>By {c.complainant_type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant="bureau" value={c.assigned_bureau}>
                        {c.assigned_bureau}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant="status" value={c.status}>
                        {c.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant="priority" value={c.priority}>
                        {c.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {c.assigned_officer_name || <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-slate-700">{c.expected_disposal_date}</span>
                      {new Date(c.expected_disposal_date) < new Date() && !["Disposed", "Closed"].includes(c.status) && (
                        <span className="text-[10px] text-rose-600 font-bold block">OVERDUE</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        to={`/cases/${encodeURIComponent(c.id)}`}
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

          {/* Pagination Footer */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} of {total} cases
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <span className="font-semibold text-slate-800">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lodge New Complaint Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Lodge New Complaint Case"
        description="Registers official complaint, assigns initial bureau, and triggers autonomous cross-bureau intelligence"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {createError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
              {createError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target AICTE Approved Institution *</label>
            <select
              required
              value={newCase.institution_id}
              onChange={(e) => setNewCase({ ...newCase, institution_id: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            >
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} (AICTE ID: {i.permanent_id} &bull; {i.state})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Complainant / Whistleblower Name *</label>
              <input
                type="text"
                required
                placeholder="Complainant name or 'Anonymous Scholar'"
                value={newCase.complainant_name}
                onChange={(e) => setNewCase({ ...newCase, complainant_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Complainant Type *</label>
              <select
                value={newCase.complainant_type}
                onChange={(e) => setNewCase({ ...newCase, complainant_type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              >
                <option value="Student">Student</option>
                <option value="Faculty">Faculty</option>
                <option value="Parent">Parent</option>
                <option value="Public">Public Citizen</option>
                <option value="Anonymous">Anonymous Whistleblower</option>
                <option value="Institution">Institution Management</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Complaint Subject / Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Mandatory Non-Refundable Caution Deposit Withholding"
              value={newCase.title}
              onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Detailed Grievance / Allegation Description *</label>
            <textarea
              required
              rows={4}
              placeholder="Provide complete factual allegations, dates, relevant departments, and evidence references..."
              value={newCase.description}
              onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Complaint Category *</label>
              <select
                value={newCase.category}
                onChange={(e) => setNewCase({ ...newCase, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              >
                <option value="Fee Overcharging">Fee Overcharging</option>
                <option value="Unapproved Courses">Unapproved Courses</option>
                <option value="Faculty Exploitation">Faculty Exploitation</option>
                <option value="Infrastructure Deficit">Infrastructure Deficit</option>
                <option value="Admission Irregularity">Admission Irregularity</option>
                <option value="Ragging & Safety">Ragging & Safety</option>
                <option value="Harassment">Harassment</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Priority *</label>
              <select
                value={newCase.priority}
                onChange={(e) => setNewCase({ ...newCase, priority: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Initial Assigned Bureau *</label>
              <select
                value={newCase.assigned_bureau}
                onChange={(e) => setNewCase({ ...newCase, assigned_bureau: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              >
                <option value="RB">Regulation Bureau (RB)</option>
                <option value="PGRC">Public Grievance Redressal Cell (PGRC)</option>
                <option value="APPROVAL_BUREAU">Approval Bureau</option>
                <option value="FINANCE_BUREAU">Finance Bureau</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Statutory Disposal Deadline *</label>
              <input
                type="date"
                required
                value={newCase.expected_disposal_date}
                onChange={(e) => setNewCase({ ...newCase, expected_disposal_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assign Investigating Officer</label>
              <select
                value={newCase.assigned_officer_id || ""}
                onChange={(e) =>
                  setNewCase({ ...newCase, assigned_officer_id: e.target.value ? Number(e.target.value) : undefined })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              >
                <option value="">Leave Unassigned (Pool Queue)</option>
                {officers.map((off) => (
                  <option key={off.id} value={off.id}>
                    {off.full_name} ({off.role.replace("_", " ")})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {createMutation.isPending ? "Lodging & Scanning..." : "Register Complaint Case"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
