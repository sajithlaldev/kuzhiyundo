import { Flag, ThumbsUp, TrendingUp } from "lucide-react";
import type { UserStats } from "./types";

interface StatsGridProps {
  stats: UserStats;
}

export default function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-3 gap-px bg-blue-200/30 dark:bg-cyan-500/10 border-b border-blue-200/50 dark:border-cyan-500/20">
      <div className="bg-white/95 dark:bg-neutral-950/95 flex flex-col items-center py-3 font-mono">
        <span className="text-xl font-bold text-blue-700 dark:text-cyan-400 tabular-nums">
          {stats.totalReports}
        </span>
        <span className="text-[8px] uppercase tracking-widest text-blue-500/60 dark:text-cyan-500/40 flex items-center gap-0.5">
          <Flag className="w-2.5 h-2.5" /> Reports
        </span>
      </div>
      <div className="bg-white/95 dark:bg-neutral-950/95 flex flex-col items-center py-3 font-mono">
        <span className="text-xl font-bold text-green-600 dark:text-green-400 tabular-nums">
          {stats.totalUpvotes}
        </span>
        <span className="text-[8px] uppercase tracking-widest text-blue-500/60 dark:text-cyan-500/40 flex items-center gap-0.5">
          <ThumbsUp className="w-2.5 h-2.5" /> Upvotes
        </span>
      </div>
      <div className="bg-white/95 dark:bg-neutral-950/95 flex flex-col items-center py-3 font-mono">
        <span
          className={`text-xl font-bold tabular-nums ${
            stats.netVotes >= 0
              ? "text-blue-700 dark:text-cyan-400"
              : "text-red-500"
          }`}
        >
          {stats.netVotes >= 0 ? "+" : ""}
          {stats.netVotes}
        </span>
        <span className="text-[8px] uppercase tracking-widest text-blue-500/60 dark:text-cyan-500/40 flex items-center gap-0.5">
          <TrendingUp className="w-2.5 h-2.5" /> Net Score
        </span>
      </div>
    </div>
  );
}
