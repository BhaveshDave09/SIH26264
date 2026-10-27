import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  Shield,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
} from "lucide-react";
import { getUsers, createUser, CreateUserPayload } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { Badge } from "../components/Badge";
import { Modal } from "../components/Modal";
import { LoadingState } from "../components/LoadingState";

export const UserManagementPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<CreateUserPayload>({
    username: "",
    email: "",
    full_name: "",
    password: "",
    role: "BUREAU_OFFICER",
    bureau: "RB",
    region: "North",
  });
  const [formError, setFormError] = useState<string | null>(null);

  const { data: usersList = [], isLoading, error } = useQuery({
    queryKey: ["users-all"],
    queryFn: () => getUsers(),
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-all"] });
      setShowCreateModal(false);
      setFormData({
        username: "",
        email: "",
        full_name: "",
        password: "",
        role: "BUREAU_OFFICER",
        bureau: "RB",
        region: "North",
      });
    },
    onError: (err: any) => setFormError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    createMutation.mutate(formData);
  };

  if (user?.role !== "SUPER_ADMIN") {
    return (
      <div className="p-8 text-center text-rose-600 bg-rose-50 border border-rose-200 rounded-xl my-6">
        <Shield className="w-8 h-8 mx-auto mb-2 text-rose-500" />
        <h3 className="font-bold text-sm">Access Denied</h3>
        <p className="text-xs text-rose-500 mt-1">
          Only Super Administrators can manage user permissions and access control records.
        </p>
      </div>
    );
  }

  if (isLoading) return <LoadingState message="Fetching system users and role policies..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User Administration &amp; RBAC</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Role-Based &amp; Attribute-Based Access Control (RBAC/ABAC) directory for AICTE Sentinel
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Official User</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Official Name</th>
                <th className="px-4 py-3">Username &amp; Email</th>
                <th className="px-4 py-3">Assigned Role</th>
                <th className="px-4 py-3">Bureau Scope</th>
                <th className="px-4 py-3">Regional Scope</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">{u.full_name}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono font-medium text-slate-800 block">@{u.username}</span>
                    <span className="text-[10px] text-slate-400">{u.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="neutral" className="font-semibold text-[10px]">
                      {u.role.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="bureau" value={u.bureau}>
                      {u.bureau}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{u.region} Region</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Register New Official User"
        description="Create credentials and assign Bureau & Regional authorization scope"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Legal Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Dr. Ramesh Kumar"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Username *</label>
              <input
                type="text"
                required
                placeholder="e.g. ramesh_rb"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Email *</label>
              <input
                type="email"
                required
                placeholder="officer@aicte-india.org"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Initial Password *</label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assigned Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              >
                <option value="BUREAU_OFFICER">Bureau Officer</option>
                <option value="BUREAU_HEAD">Bureau Head</option>
                <option value="REGIONAL_OFFICER">Regional Officer</option>
                <option value="READ_ONLY">Read-Only Viewer</option>
                <option value="SUPER_ADMIN">Super Administrator</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bureau Scope *</label>
              <select
                value={formData.bureau}
                onChange={(e) => setFormData({ ...formData, bureau: e.target.value })}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              >
                <option value="RB">Regulation Bureau (RB)</option>
                <option value="PGRC">Public Grievance Redressal Cell</option>
                <option value="APPROVAL_BUREAU">Approval Bureau</option>
                <option value="FINANCE_BUREAU">Finance Bureau</option>
                <option value="ALL">All Bureaus (National)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Regional Scope *</label>
              <select
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              >
                <option value="North">North</option>
                <option value="South">South</option>
                <option value="East">East</option>
                <option value="West">West</option>
                <option value="Central">Central</option>
                <option value="North-West">North-West</option>
                <option value="ALL">All Regions</option>
              </select>
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
              {createMutation.isPending ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
