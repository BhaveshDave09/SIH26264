import React from "react";
import { Loader2 } from "lucide-react";

export const LoadingState: React.FC<{ message?: string }> = ({ message = "Loading data from NivaranX server..." }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center min-h-[300px]">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-600">{message}</p>
      <span className="text-xs text-slate-400 mt-1">Executing relational database query</span>
    </div>
  );
};

export { EmptyState } from "./EmptyState";
