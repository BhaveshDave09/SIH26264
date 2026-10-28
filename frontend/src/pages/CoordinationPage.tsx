import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Network, Plus, Send } from "lucide-react";
import { getCoordinationTasks, getCoordinationTaskById, createCoordinationTask, addCoordinationUpdate, CoordinationTaskItem, CreateCoordinationTaskPayload } from "../api/coordination";
import { getInstitutions } from "../api/institutions";
import { getOfficers } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { Badge } from "../components/Badge";
import { Modal } from "../components/Modal";
import { LoadingState } from "../components/LoadingState";
import { EmptyState } from "../components/EmptyState";

export const CoordinationPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [selectedTask, setSelectedTask] = useState<CoordinationTaskItem | null>(null);

  // Create Task Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState<CreateCoordinationTaskPayload>({
    title: "",
    description: "",
    institution_id: 1,
    primary_case_id: "",
    related_case_ids: [],
    originating_bureau: user?.bureau !== "ALL" ? user?.bureau || "RB" : "RB",
    participating_bureaus: ["RB", "PGRC"],
    assigned_owner_id: user?.id || 1,
    priority: "High",
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  });
  const [relatedCaseInput, setRelatedCaseInput] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Add Update Modal/Form inside task viewer
  const [updateRemarks, setUpdateRemarks] = useState("");
  const [updateType, setUpdateType] = useState<"COMMENT" | "STATUS_CHANGE" | "REASSIGNMENT" | "HANDOFF">("COMMENT");
  const [updateNewStatus, setUpdateNewStatus] = useState<string>("In Progress");
  const [updateNewOwnerId, setUpdateNewOwnerId] = useState<number>(0);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ["coordination-tasks", statusFilter, priorityFilter],
    queryFn: () =>
      getCoordinationTasks({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        priority: priorityFilter !== "ALL" ? priorityFilter : undefined,
      }),
  });

  const { data: institutions = [] } = useQuery({
    queryKey: ["institutions-dropdown"],
    queryFn: () => getInstitutions(),
  });

  const { data: officers = [] } = useQuery({
    queryKey: ["all-officers"],
    queryFn: () => getOfficers(),
  });

  // Create Task Mutation
  const createMutation = useMutation({
    mutationFn: createCoordinationTask,
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ["coordination-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setShowCreateModal(false);
      setNewTask({
        title: "",
        description: "",
        institution_id: institutions[0]?.id || 1,
        primary_case_id: "",
        related_case_ids: [],
        originating_bureau: "RB",
        participating_bureaus: ["RB", "PGRC"],
        assigned_owner_id: officers[0]?.id || 1,
        priority: "High",
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      });
      setSelectedTask(task);
    },
    onError: (err: any) => setCreateError(err.message),
  });

  // Add Update Mutation
  const addUpdateMutation = useMutation({
    mutationFn: () => {
      if (!selectedTask) throw new Error("No task selected");
      return addCoordinationUpdate(selectedTask.id, {
        update_type: updateType,
        remarks: updateRemarks,
        new_status: updateType === "STATUS_CHANGE" ? updateNewStatus : undefined,
        new_owner_id: updateType === "REASSIGNMENT" ? updateNewOwnerId : undefined,
      });
    },
    onSuccess: async () => {
      if (selectedTask) {
        const refreshed = await getCoordinationTaskById(selectedTask.id);
        setSelectedTask(refreshed);
      }
      queryClient.invalidateQueries({ queryKey: ["coordination-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setUpdateRemarks("");
      setUpdateError(null);
    },
    onError: (err: any) => setUpdateError(err.message),
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    createMutation.mutate(newTask);
  };

  const handleSelectTask = async (task: CoordinationTaskItem) => {
    try {
      const full = await getCoordinationTaskById(task.id);
      setSelectedTask(full);
      setUpdateNewStatus(full.status);
      setUpdateNewOwnerId(full.assigned_owner_id);
    } catch {
      setSelectedTask(task);
    }
  };

  const isReadOnly = user?.role === "READ_ONLY";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inter-Bureau Coordination Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active joint investigation tasks, cross-bureau handoffs, and accountability tracking across AICTE cells
          </p>
        </div>

        {!isReadOnly && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Coordination Task</span>
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
        >
          <option value="ALL">All Task Statuses</option>
          <option value="Open">Open</option>
          <option value="Accepted">Accepted</option>
          <option value="In Progress">In Progress</option>
          <option value="Waiting for Response">Waiting for Response</option>
          <option value="Resolved">Resolved</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
        >
          <option value="ALL">All Priorities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Main 2-Column Layout: Task List (Left) & Task Detail / Updates Log (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Cards Column */}
        <div className="lg:col-span-1 space-y-3">
          {isLoading ? (
            <LoadingState message="Loading coordination tasks..." />
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
              Failed to load tasks: {String(error)}
            </div>
          ) : tasks.length === 0 ? (
            <EmptyState
              title="No coordination tasks"
              description="No active tasks matching this status."
              icon={<Network className="w-8 h-8 text-slate-400" />}
            />
          ) : (
            tasks.map((task) => {
              const isSelected = selectedTask?.id === task.id;
              return (
                <div
                  key={task.id}
                  onClick={() => handleSelectTask(task)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-blue-50/60 border-blue-600 ring-2 ring-blue-100 shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-teal-700">{task.id}</span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="status" value={task.status}>
                        {task.status}
                      </Badge>
                      <Badge variant="priority" value={task.priority}>
                        {task.priority}
                      </Badge>
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 line-clamp-1 mt-1">{task.title}</h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{task.description}</p>

                  <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-medium text-slate-700">{task.institution_name}</span>
                    <span className={`font-semibold ${task.is_overdue ? "text-rose-600 font-bold" : ""}`}>
                      Due: {task.due_date}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Task Details & Updates Timeline (Right 2 cols) */}
        <div className="lg:col-span-2">
          {selectedTask ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              {/* Header */}
              <div className="pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {selectedTask.id}
                    </span>
                    <Badge variant="status" value={selectedTask.status}>
                      {selectedTask.status}
                    </Badge>
                    <Badge variant="priority" value={selectedTask.priority}>
                      {selectedTask.priority}
                    </Badge>
                    {selectedTask.is_overdue && <Badge variant="danger">OVERDUE SLA</Badge>}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">{selectedTask.title}</h2>
                  <p className="text-xs text-slate-600">{selectedTask.description}</p>
                </div>
              </div>

              {/* Task Attributes Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Target Institution</span>
                  <p className="font-bold text-slate-900 mt-0.5 truncate">{selectedTask.institution_name}</p>
                  <span className="text-[10px] text-slate-500">ID: {selectedTask.institution_permanent_id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Lead Owner</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{selectedTask.assigned_owner_name}</p>
                  <span className="text-[10px] text-slate-500">Origin: {selectedTask.originating_bureau}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Participating Bureaus</span>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {selectedTask.participating_bureaus.map((b) => (
                      <span key={b} className="px-1.5 py-0.2 bg-white border border-slate-200 text-slate-700 rounded text-[10px] font-bold">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Target Due Date</span>
                  <p className={`font-mono font-bold mt-0.5 ${selectedTask.is_overdue ? "text-rose-600" : "text-slate-900"}`}>
                    {selectedTask.due_date}
                  </p>
                </div>
              </div>

              {/* Linked Cases References */}
              <div className="text-xs space-y-1">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Linked Cases:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    to={`/cases/${encodeURIComponent(selectedTask.primary_case_id)}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded font-mono font-bold text-xs hover:underline"
                  >
                    <span>Primary: {selectedTask.primary_case_id}</span>
                  </Link>
                  {selectedTask.related_case_ids.map((rc) => (
                    <Link
                      key={rc}
                      to={`/cases/${encodeURIComponent(rc)}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded font-mono text-xs hover:underline"
                    >
                      <span>Related: {rc}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Post Coordination Update (Handoff / Comment / Status) */}
              {!isReadOnly && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                  {updateError && <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs">{updateError}</div>}`r`n                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                      Post Inter-Bureau Update or Handoff
                    </span>
                    <select
                      value={updateType}
                      onChange={(e) => setUpdateType(e.target.value as any)}
                      className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold"
                    >
                      <option value="COMMENT">Post Progress Remark</option>
                      <option value="STATUS_CHANGE">Change Task Status</option>
                      <option value="REASSIGNMENT">Reassign Task Owner</option>
                      <option value="HANDOFF">Record Inter-Bureau Handoff</option>
                    </select>
                  </div>

                  {updateType === "STATUS_CHANGE" && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">New Task Status</label>
                      <select
                        value={updateNewStatus}
                        onChange={(e) => setUpdateNewStatus(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      >
                        <option value="Accepted">Accepted</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Waiting for Response">Waiting for Response</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  )}

                  {updateType === "REASSIGNMENT" && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Select New Owner</label>
                      <select
                        value={updateNewOwnerId}
                        onChange={(e) => setUpdateNewOwnerId(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      >
                        {officers.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.full_name} ({o.bureau})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <textarea
                      rows={2}
                      placeholder="Enter update minutes, evidence received, or inter-bureau agreements..."
                      value={updateRemarks}
                      onChange={(e) => setUpdateRemarks(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      disabled={addUpdateMutation.isPending || !updateRemarks.trim()}
                      onClick={() => addUpdateMutation.mutate()}
                      className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{addUpdateMutation.isPending ? "Posting..." : "Commit Update"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Chronological Coordination Updates Thread */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Coordination History &amp; Actions Log
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/40">
                  {selectedTask.updates && selectedTask.updates.length > 0 ? (
                    selectedTask.updates.map((u) => (
                      <div key={u.id} className="p-3.5 text-xs space-y-1">
                        {updateError && <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs">{updateError}</div>}`r`n                  <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">@{u.username}</span>
                            <Badge variant="neutral" className="text-[10px]">
                              {u.update_type}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(u.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-700 leading-relaxed text-xs">{u.remarks}</p>
                      </div>
                    ))
                  ) : (
                    <p className="p-4 text-center text-slate-400 text-xs">No updates recorded yet.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
              <Network className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-medium text-sm text-slate-600">Select a task from the list</p>
              <p className="text-xs mt-1">View participating bureaus, assignments, and inter-bureau updates thread.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Coordination Task Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Establish Inter-Bureau Coordination Task"
        description="Creates joint inquiry ownership between multiple AICTE Bureaus to address overlapping complaints"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {createError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
              {createError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target Institution *</label>
            <select
              value={newTask.institution_id}
              onChange={(e) => setNewTask({ ...newTask, institution_id: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} (ID: {i.permanent_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Task Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Joint Inquiry: Fee Overcharging and Unapproved Classes"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Coordination Scope & Directive *</label>
            <textarea
              required
              rows={3}
              placeholder="Specify the coordination objective, shared evidence to harmonize, and responsible action points..."
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Primary Case ID *</label>
              <input
                type="text"
                required
                placeholder="e.g. AICTE/PGRC/2026/001"
                value={newTask.primary_case_id}
                onChange={(e) => setNewTask({ ...newTask, primary_case_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Related Case IDs</label>
              <input
                type="text"
                placeholder="Comma separated: AICTE/RB/2026/002"
                value={relatedCaseInput}
                onChange={(e) => {
                  setRelatedCaseInput(e.target.value);
                  setNewTask({
                    ...newTask,
                    related_case_ids: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assign Lead Owner *</label>
              <select
                value={newTask.assigned_owner_id}
                onChange={(e) => setNewTask({ ...newTask, assigned_owner_id: Number(e.target.value) })}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg"
              >
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.full_name} ({o.bureau})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Priority *</label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Due Date *</label>
              <input
                type="date"
                required
                value={newTask.due_date}
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Establish Task"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

