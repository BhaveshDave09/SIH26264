import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Filter } from "lucide-react";
import { getReportStats, exportFilteredCasesCsv } from "../api/reports";
import { Badge } from "../components/Badge";
import { LoadingState } from "../components/LoadingState";

export const ReportsPage: React.FC = () => {
  const [bureau, setBureau] = useState("ALL");
  const [region, setRegion] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exporting, setExporting] = useState(false);

  const { data: report, isLoading, error } = useQuery({
    queryKey: ["report-stats", bureau, region, startDate, endDate],
    queryFn: () =>
      getReportStats({
        bureau: bureau !== "ALL" ? bureau : undefined,
        region: region !== "ALL" ? region : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      }),
  });

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await exportFilteredCasesCsv({
        bureau: bureau !== "ALL" ? bureau : undefined,
        region: region !== "ALL" ? region : undefined,
      });
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) return <LoadingState message="Aggregating statutory reports across Bureaus..." />;
  if (error || !report) {
    return <div className="p-8 text-rose-600 bg-rose-50 rounded-xl">Failed to generate reports</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header & Export Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Reports &amp; Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Bureau disposal velocity, regional grievance distribution, and official CSV data extraction
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 self-start md:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>{exporting ? "Streaming Export..." : "Export Filtered Cases (CSV)"}</span>
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Filters:</span>
        </div>

        <select
          value={bureau}
          onChange={(e) => setBureau(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-hidden"
        >
          <option value="ALL">All Bureaus</option>
          <option value="RB">Regulation Bureau (RB)</option>
          <option value="PGRC">PGRC</option>
          <option value="APPROVAL_BUREAU">Approval Bureau</option>
          <option value="FINANCE_BUREAU">Finance Bureau</option>
        </select>

        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-hidden"
        >
          <option value="ALL">All Regions</option>
          <option value="North">North</option>
          <option value="South">South</option>
          <option value="East">East</option>
          <option value="West">West</option>
          <option value="Central">Central</option>
          <option value="North-West">North-West</option>
        </select>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">From:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">To:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
          />
        </div>

        {(bureau !== "ALL" || region !== "ALL" || startDate || endDate) && (
          <button
            onClick={() => {
              setBureau("ALL");
              setRegion("ALL");
              setStartDate("");
              setEndDate("");
            }}
            className="text-blue-700 hover:underline font-semibold ml-auto"
          >
            Reset
          </button>
        )}
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Scrutinized Cases</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{report.total_cases_analyzed}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Avg Resolution Days</span>
          <p className="text-2xl font-bold text-blue-700 mt-1">{report.avg_resolution_days} Days</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Confirmed Overlaps</span>
          <p className="text-2xl font-bold text-purple-700 mt-1">{report.total_confirmed_overlaps}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Coordination Resolution</span>
          <p className="text-2xl font-bold text-teal-700 mt-1">{report.coordination_resolution_rate}%</p>
        </div>
      </div>

      {/* Bureau Performance Table */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Bureau-Wise Case Disposal Performance
          </h3>
          <p className="text-xs text-slate-500">
            Workload, disposal percentage, and average complaint ageing metrics
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Bureau / Cell</th>
                <th className="px-4 py-3">Total Received</th>
                <th className="px-4 py-3">Active Pending</th>
                <th className="px-4 py-3">Disposed</th>
                <th className="px-4 py-3">Overdue SLA</th>
                <th className="px-4 py-3">Disposal Rate</th>
                <th className="px-4 py-3">Average Age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.bureau_summary.map((b) => (
                <tr key={b.bureau} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    <Badge variant="bureau" value={b.bureau}>
                      {b.bureau}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{b.total_received}</td>
                  <td className="px-4 py-3 text-amber-600 font-semibold">{b.pending}</td>
                  <td className="px-4 py-3 text-emerald-600 font-semibold">{b.disposed}</td>
                  <td className="px-4 py-3 text-rose-600 font-bold">{b.overdue}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-2 rounded-full"
                          style={{ width: `${b.disposal_rate}%` }}
                        />
                      </div>
                      <span className="font-semibold text-slate-900">{b.disposal_rate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-700">{b.avg_age_days} Days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Regional Jurisdiction Summary */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Regional Jurisdiction Distribution
          </h3>
          <p className="text-xs text-slate-500">Complaint concentration across AICTE administrative zones</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Zone / Region</th>
                <th className="px-4 py-3">Institutions Registered</th>
                <th className="px-4 py-3">Total Cases</th>
                <th className="px-4 py-3">Active Proceedings</th>
                <th className="px-4 py-3">Overdue SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.region_summary.map((r) => (
                <tr key={r.region} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">{r.region} Region</td>
                  <td className="px-4 py-3 text-slate-700">{r.total_institutions} Institutions</td>
                  <td className="px-4 py-3 font-semibold text-blue-700">{r.total_cases}</td>
                  <td className="px-4 py-3 font-medium text-amber-700">{r.active_cases}</td>
                  <td className="px-4 py-3 font-bold text-rose-700">{r.overdue_cases}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

