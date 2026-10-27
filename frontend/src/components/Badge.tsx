import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "status" | "priority" | "bureau" | "relationship" | "neutral" | "danger" | "success" | "warning";
  value?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = "neutral", value, className = "" }) => {
  const text = (value || String(children)).toLowerCase().trim();

  let colorClasses = "bg-slate-100 text-slate-700 border-slate-200";

  if (variant === "status") {
    if (text === "received" || text === "pending review") {
      colorClasses = "bg-amber-50 text-amber-700 border-amber-200";
    } else if (text === "under process" || text === "in progress" || text === "accepted") {
      colorClasses = "bg-blue-50 text-blue-700 border-blue-200";
    } else if (text === "transferred") {
      colorClasses = "bg-purple-50 text-purple-700 border-purple-200";
    } else if (text === "escalated") {
      colorClasses = "bg-rose-50 text-rose-700 border-rose-200 font-medium animate-pulse";
    } else if (text === "disposed" || text === "closed" || text === "resolved") {
      colorClasses = "bg-emerald-50 text-emerald-700 border-emerald-200";
    } else if (text === "waiting for response") {
      colorClasses = "bg-orange-50 text-orange-700 border-orange-200";
    }
  } else if (variant === "priority") {
    if (text === "critical") {
      colorClasses = "bg-rose-100 text-rose-800 border-rose-300 font-bold";
    } else if (text === "high") {
      colorClasses = "bg-orange-100 text-orange-800 border-orange-300 font-semibold";
    } else if (text === "medium") {
      colorClasses = "bg-blue-50 text-blue-700 border-blue-200";
    } else {
      colorClasses = "bg-slate-100 text-slate-600 border-slate-200";
    }
  } else if (variant === "bureau") {
    if (text.includes("rb") || text.includes("regulation")) {
      colorClasses = "bg-indigo-50 text-indigo-700 border-indigo-200 font-medium";
    } else if (text.includes("pgrc") || text.includes("grievance")) {
      colorClasses = "bg-teal-50 text-teal-700 border-teal-200 font-medium";
    } else if (text.includes("approval")) {
      colorClasses = "bg-sky-50 text-sky-700 border-sky-200 font-medium";
    } else if (text.includes("finance")) {
      colorClasses = "bg-emerald-50 text-emerald-700 border-emerald-200 font-medium";
    } else {
      colorClasses = "bg-slate-100 text-slate-700 border-slate-200";
    }
  } else if (variant === "relationship") {
    if (text.includes("action_conflict")) {
      colorClasses = "bg-rose-100 text-rose-800 border-rose-300 font-bold";
    } else if (text.includes("duplicate")) {
      colorClasses = "bg-purple-100 text-purple-800 border-purple-300 font-semibold";
    } else if (text.includes("related")) {
      colorClasses = "bg-blue-100 text-blue-800 border-blue-300 font-medium";
    } else {
      colorClasses = "bg-amber-100 text-amber-800 border-amber-300 font-medium";
    }
  } else if (variant === "danger") {
    colorClasses = "bg-rose-50 text-rose-700 border-rose-200";
  } else if (variant === "success") {
    colorClasses = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (variant === "warning") {
    colorClasses = "bg-amber-50 text-amber-700 border-amber-200";
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border tracking-tight ${colorClasses} ${className}`}
    >
      {children}
    </span>
  );
};
