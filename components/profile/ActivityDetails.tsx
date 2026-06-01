import { Award, MapPin, Calendar, ThumbsDown } from "lucide-react";
import type { UserStats } from "./types";
import { formatDate } from "./types";

interface ActivityDetailsProps {
  stats: UserStats;
}

export default function ActivityDetails({ stats }: ActivityDetailsProps) {
  return (
    <div className="px-4 py-3 space-y-2.5 font-mono">
      <div className="text-[9px] uppercase tracking-widest text-blue-500/60 dark:text-cyan-500/40 flex items-center gap-1">
        <Award className="w-3 h-3" /> Activity Details
      </div>

      <DetailRow
        icon={<MapPin className="w-3.5 h-3.5" />}
        label="Top Location"
        value={stats.topLocation}
      />
      <DetailRow
        icon={<Calendar className="w-3.5 h-3.5" />}
        label="First Report"
        value={formatDate(stats.firstReportDate)}
      />
      <DetailRow
        icon={<Calendar className="w-3.5 h-3.5" />}
        label="Latest Report"
        value={formatDate(stats.latestReportDate)}
      />
      <DetailRow
        icon={<ThumbsDown className="w-3.5 h-3.5" />}
        label="Downvotes Received"
        value={String(stats.totalDownvotes)}
      />
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-blue-100/50 dark:border-cyan-500/10 last:border-b-0">
      <div className="flex items-center gap-2 text-blue-500/70 dark:text-cyan-500/50">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-[11px] font-bold text-blue-800 dark:text-cyan-300 truncate max-w-[160px] text-right">
        {value}
      </span>
    </div>
  );
}
