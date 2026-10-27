import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Building2,
  Search,
  Plus,
  MapPin,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Building,
} from "lucide-react";
import { getInstitutions, createInstitution, CreateInstitutionPayload } from "../api/institutions";
import { useAuth } from "../context/AuthContext";
import { Badge } from "../components/Badge";
import { Modal } from "../components/Modal";
import { LoadingState } from "../components/LoadingState";
import { EmptyState } from "../components/EmptyState";

export const InstitutionsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateInstitutionPayload>({
    permanent_id: "",
    name: "",
    address: "",
    state: "",
    region: "North",
    category: "Engineering & Technology",
    status: "Active",
    aliases: [],
  });
  const [aliasInput, setAliasInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data: institutions = [], isLoading, error } = useQuery({
    queryKey: ["institutions", search, regionFilter, statusFilter],
    queryFn: () =>
      getInstitutions({
        q: search || undefined,
        region: regionFilter !== "ALL" ? regionFilter : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      }),
  });

  const createMutation = useMutation({
    mutationFn: createInstitution,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["institutions"] });
      setShowCreateModal(false);
      setFormData({
        permanent_id: "",
        name: "",
        address: "",
        state: "",
        region: "North",
        category: "Engineering & Technology",
        status: "Active",
        aliases: [],
      });
      setAliasInput("");
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to create institution record.");
    },
  });

  const handleAddAlias = () => {
    if (aliasInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        aliases: [...(prev.aliases || []), aliasInput.trim()],
      }));
      setAliasInput("");
    }
  };

  const handleRemoveAlias = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      aliases: (prev.aliases || []).filter((_, i) => i !== index),
    }));
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AICTE Approved Institutions Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Searchable registry indexed by AICTE Permanent Institution ID, state jurisdiction, and recognized aliases
          </p>
        </div>

        {user?.role !== "READ_ONLY" && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Register Institution</span>
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Institution Name, Permanent ID (e.g. 1-1029384751), or State..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
          >
            <option value="ALL">All Regions</option>
            <option value="North">North</option>
            <option value="South">South</option>
            <option value="East">East</option>
            <option value="West">West</option>
            <option value="Central">Central</option>
            <option value="North-West">North-West</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-blue-600"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Under Scrutiny">Under Scrutiny</option>
            <option value="Deficient">Deficient</option>
          </select>
        </div>
      </div>

      {/* Results Table */}
      {isLoading ? (
        <LoadingState message="Fetching institutions from AICTE database..." />
      ) : error ? (
        <div className="p-8 text-center text-rose-600 bg-rose-50 border border-rose-200 rounded-xl">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
          <p className="text-sm font-semibold">Failed to load institutions</p>
          <p className="text-xs text-rose-500 mt-1">{String(error)}</p>
        </div>
      ) : institutions.length === 0 ? (
        <EmptyState
          title="No institutions found"
          description="Try broadening your search query or clear regional filters."
          icon={<Building className="w-8 h-8 text-slate-400" />}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">AICTE Permanent ID</th>
                  <th className="px-4 py-3">Institution Name & Aliases</th>
                  <th className="px-4 py-3">Region & State</th>
                  <th className="px-4 py-3">Discipline</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {institutions.map((inst) => (
                  <tr key={inst.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {inst.permanent_id}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/institutions/${inst.id}`}
                        className="text-sm font-semibold text-slate-900 hover:text-blue-700 hover:underline block"
                      >
                        {inst.name}
                      </Link>
                      {inst.aliases && inst.aliases.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[10px] text-slate-400">Aliases:</span>
                          {inst.aliases.map((a) => (
                            <span
                              key={a.id}
                              className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] border border-slate-200"
                            >
                              {a.alias_name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-slate-800">{inst.state}</span>
                      <span className="text-slate-400 text-[11px] block">({inst.region} Region)</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{inst.category}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          inst.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : inst.status === "Under Scrutiny"
                            ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {inst.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        to={`/institutions/${inst.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
                      >
                        <span>360° Profile</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Register Institution Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Register New AICTE Approved Institution"
        description="Add institution reference with permanent ID and recognized name variations"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                AICTE Permanent Institution ID *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 1-9988776655"
                value={formData.permanent_id}
                onChange={(e) => setFormData({ ...formData, permanent_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Primary deduplication & linking key</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              >
                <option value="Active">Active</option>
                <option value="Under Scrutiny">Under Scrutiny</option>
                <option value="Deficient">Deficient</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Legal Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. National Institute of Applied Engineering & Sciences"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Campus Address *</label>
            <input
              type="text"
              required
              placeholder="Full campus location address..."
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">State *</label>
              <input
                type="text"
                required
                placeholder="e.g. Maharashtra"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">AICTE Region *</label>
              <select
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              >
                <option value="North">North</option>
                <option value="South">South</option>
                <option value="East">East</option>
                <option value="West">West</option>
                <option value="Central">Central</option>
                <option value="North-West">North-West</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Discipline *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              >
                <option value="Engineering & Technology">Engineering & Technology</option>
                <option value="Management">Management</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Architecture & Town Planning">Architecture & Town Planning</option>
                <option value="Applied Arts & Crafts">Applied Arts & Crafts</option>
              </select>
            </div>
          </div>

          {/* Alternate Names / Aliases */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Institution Aliases / Common Abbreviations
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="e.g. NIAES Pune"
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
              <button
                type="button"
                onClick={handleAddAlias}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg text-xs"
              >
                Add Alias
              </button>
            </div>
            {formData.aliases && formData.aliases.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {formData.aliases.map((alias, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200 text-xs"
                  >
                    <span>{alias}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAlias(idx)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
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
              {createMutation.isPending ? "Registering..." : "Confirm Registration"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
