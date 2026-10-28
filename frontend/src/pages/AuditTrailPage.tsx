import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ShieldAlert, RotateCw, AlertTriangle } from "lucide-react";
import { getAuditTrail, verifyAuditChain, simulateTamper, restoreAuditChain } from "../api/audit";
import { useAuth } from "../context/AuthContext";
import { Badge } from "../components/Badge";
import { LoadingState } from "../components/LoadingState";

export const AuditTrailPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [entityTypeFilter, setEntityTypeFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [tamperMessage, setTamperMessage] = useState<string | null>(null);

  const { data: auditEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["audit-events", entityTypeFilter, actionFilter],
    queryFn: () =>
      getAuditTrail({
        entity_type: entityTypeFilter !== "ALL" ? entityTypeFilter : undefined,
        action: actionFilter !== "ALL" ? actionFilter : undefined,
      }),
  });

  const { data: verification, isLoading: verifying, refetch: reVerify } = useQuery({
    queryKey: ["audit-verification"],
    queryFn: verifyAuditChain,
  });

  const tamperMutation = useMutation({
    mutationFn: simulateTamper,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["audit-verification"] });
      queryClient.invalidateQueries({ queryKey: ["audit-events"] });
      setTamperMessage(
        `Simulation Active: ${data.message} Stored hash was corrupted. Chain integrity test will now detect the break!`
      );
    },
  });

  const restoreMutation = useMutation({
    mutationFn: restoreAuditChain,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-verification"] });
      queryClient.invalidateQueries({ queryKey: ["audit-events"] });
      setTamperMessage("Restored: Cryptographic hash chain successfully recomputed and verified.");
      setTimeout(() => setTamperMessage(null), 6000);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Tamper-Evident Cryptographic Audit Trail
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
              SHA-256 HASH-LINKED
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographic ledger tracking every case lifecycle mutation, inter-bureau handoff, and official decision
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            onClick={() => reVerify()}
            disabled={verifying}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${verifying ? "animate-spin" : ""}`} />
            <span>Verify Chain Integrity</span>
          </button>

          {user?.role === "SUPER_ADMIN" && (
            <>
              <button
                onClick={() => tamperMutation.mutate()}
                disabled={tamperMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                title="Simulates record tampering to demonstrate instant detection by the verification algorithm"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Simulate Tamper (Demo Test)</span>
              </button>

              <button
                onClick={() => restoreMutation.mutate()}
                disabled={restoreMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <span>Restore Chain</span>
              </button>
            </>
          )}
        </div>
      </div>

      {tamperMessage && (
        <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>{tamperMessage}</span>
          </div>
          <button onClick={() => setTamperMessage(null)} className="font-bold text-amber-800">
            &times;
          </button>
        </div>
      )}

      {/* Verification Status Card */}
      {verification && (
        <div
          className={`p-5 rounded-2xl border transition-all ${
            verification.is_valid
              ? "bg-emerald-50/50 border-emerald-200 text-emerald-950"
              : "bg-rose-50/70 border-rose-300 text-rose-950 animate-pulse"
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-xl text-white ${
                  verification.is_valid ? "bg-emerald-600" : "bg-rose-600"
                }`}
              >
                {verification.is_valid ? (
                  <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
                ) : (
                  <ShieldAlert className="w-6 h-6 stroke-[2.2]" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      verification.is_valid
                        ? "bg-emerald-200 text-emerald-900"
                        : "bg-rose-200 text-rose-900 font-extrabold"
                    }`}
                  >
                    {verification.is_valid ? "CHAIN INTEGRITY: VALID" : "INTEGRITY BREACH DETECTED"}
                  </span>
                  <span className="text-xs text-slate-600 font-medium">
                    Verified {verification.total_events} Sequential Cryptographic Blocks
                  </span>
                </div>
                <h3 className="text-sm font-bold mt-1">{verification.details}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Verified against canonical SHA-256 payload serializations &bull; Timestamp:{" "}
                  {new Date(verification.verification_timestamp).toUTCString()}
                </p>
              </div>
            </div>

            <div className="p-3 bg-white/80 rounded-xl border border-slate-200 text-xs shrink-0 font-mono space-y-1">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-sans font-bold">Genesis Anchor:</span>
                <p className="text-[10px] text-slate-600 truncate max-w-xs">{verification.genesis_hash}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-sans font-bold">Latest Chain Tip:</span>
                <p className="text-[10px] text-blue-700 truncate max-w-xs">{verification.latest_hash}</p>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200/60 text-[11px] text-slate-600">
            <strong>Architecture Notice:</strong> NivaranX implements a hash-linked, tamper-evident audit ledger using canonical JSON serialization. While tamper-evident against local record alteration, production deployment requires external blockchain or WORM-storage checkpoints.
          </div>
        </div>
      )}

      {/* Filter Row */}
      <div className="flex items-center gap-2">
        <select
          value={entityTypeFilter}
          onChange={(e) => setEntityTypeFilter(e.target.value)}
          className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-hidden"
        >
          <option value="ALL">All Entity Types</option>
          <option value="Case">Case</option>
          <option value="CoordinationTask">Coordination Task</option>
          <option value="CaseRelationship">Case Relationship</option>
          <option value="Institution">Institution</option>
          <option value="User">User</option>
          <option value="System">System</option>
        </select>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-hidden"
        >
          <option value="ALL">All Actions</option>
          <option value="CASE_CREATED">CASE_CREATED</option>
          <option value="CASE_TRANSFERRED">CASE_TRANSFERRED</option>
          <option value="CASE_STATUS_CHANGED">CASE_STATUS_CHANGED</option>
          <option value="CASE_ASSIGNED">CASE_ASSIGNED</option>
          <option value="RELATIONSHIP_REVIEWED">RELATIONSHIP_REVIEWED</option>
          <option value="COORDINATION_TASK_CREATED">COORDINATION_TASK_CREATED</option>
          <option value="SLA_AUTO_ESCALATED">SLA_AUTO_ESCALATED</option>
        </select>
      </div>

      {/* Audit Ledger Table */}
      {loadingEvents ? (
        <LoadingState message="Fetching cryptographic audit ledger..." />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Block #</th>
                  <th className="px-4 py-3">Timestamp (UTC)</th>
                  <th className="px-4 py-3">Actor &amp; Role</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Details / Reason</th>
                  <th className="px-4 py-3">Cryptographic Hash Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      #{ev.id}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(ev.timestamp).toISOString().replace("T", " ").substring(0, 19)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold text-slate-900">@{ev.actor_username}</span>
                      <span className="text-[10px] text-slate-400 block">{ev.actor_role}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant="neutral" className="font-mono text-[10px]">
                        {ev.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-slate-800">{ev.entity_type}</span>
                      <span className="font-mono text-blue-700 block text-[10px]">{ev.entity_id}</span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {ev.reason && (
                        <p className="font-medium text-slate-900 text-xs mb-0.5 truncate">
                          Reason: {ev.reason}
                        </p>
                      )}
                      <p className="font-mono text-[10px] text-slate-500 truncate">{ev.details}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] whitespace-nowrap">
                      <div title={`Previous: ${ev.previous_event_hash}`}>
                        <span className="text-slate-400">Prev: </span>
                        <span className="text-slate-600">{ev.previous_event_hash.substring(0, 14)}...</span>
                      </div>
                      <div title={`Current: ${ev.event_hash}`} className="text-blue-700 font-bold">
                        <span className="text-slate-400 font-normal">Hash: </span>
                        <span>{ev.event_hash.substring(0, 14)}...</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};





