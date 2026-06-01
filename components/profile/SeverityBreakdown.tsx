import { BarChart3 } from "lucide-react";
import type { UserStats } from "./types";

interface SeverityBreakdownProps {
  stats: UserStats;
}

export default function SeverityBreakdown({ stats }: SeverityBreakdownProps) {
  if (stats.totalReports === 0) return null;

  return (
    <div className="px-4 py-3 border-b border-blue-200/50 dark:border-cyan-500/20">
      <div className="text-[9px] font-mono uppercase tracking-widest text-blue-500/60 dark:text-cyan-500/40 mb-2 flex items-center gap-1">
        <BarChart3 className="w-3 h-3" /> Severity Breakdown
      </div>
      <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-blue-100 dark:bg-cyan-950/50">
        {stats.highSeverity > 0 && (
          <div
            className="bg-[#ff003c] transition-all"
            style={{
              width: `${(stats.highSeverity / stats.totalReports) * 100}%`,
            }}
            title={`High: ${stats.highSeverity}`}
          />
        )}
        {stats.mediumSeverity > 0 && (
          <div
            className="bg-[#ff9900] transition-all"
            style={{
              width: `${(stats.mediumSeverity / stats.totalReports) * 100}%`,
            }}
            title={`Medium: ${stats.mediumSeverity}`}
          />
        )}
        {stats.lowSeverity > 0 && (
          <div
            className="bg-[#00f0ff] transition-all"
            style={{
              width: `${(stats.lowSeverity / stats.totalReports) * 100}%`,
            }}
            title={`Low: ${stats.lowSeverity}`}
          />
        )}
      </div>
      <div className="flex justify-between mt-1.5 font-mono">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#ff003c]" />
          <span className="text-[9px] text-blue-600/70 dark:text-cyan-500/60">
            High {stats.highSeverity}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#ff9900]" />
          <span className="text-[9px] text-blue-600/70 dark:text-cyan-500/60">
            Med {stats.mediumSeverity}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#00f0ff]" />
          <span className="text-[9px] text-blue-600/70 dark:text-cyan-500/60">
            Low {stats.lowSeverity}
          </span>
        </div>
      </div>
    </div>
  );
}
