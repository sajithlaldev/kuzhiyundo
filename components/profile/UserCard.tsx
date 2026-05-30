import { User, Trophy } from "lucide-react";
import type { User as FirebaseUser } from "firebase/auth";
import type { UserStats } from "./types";

interface UserCardProps {
  user: FirebaseUser;
  stats: UserStats;
}

export default function UserCard({ user, stats }: UserCardProps) {
  return (
    <div className="px-4 py-5 border-b border-blue-200/50 dark:border-cyan-500/20 bg-gradient-to-b from-blue-50/50 dark:from-cyan-950/30 to-transparent">
      <div className="flex items-center gap-3">
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt="Profile"
            className="w-14 h-14 rounded-full border-2 border-blue-300 dark:border-cyan-500/50 shadow-[0_0_12px_rgba(0,100,255,0.15)] dark:shadow-[0_0_12px_rgba(0,255,255,0.15)]"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-14 h-14 rounded-full border-2 border-blue-300 dark:border-cyan-500/50 bg-blue-100 dark:bg-cyan-900/50 flex items-center justify-center shadow-[0_0_12px_rgba(0,100,255,0.15)] dark:shadow-[0_0_12px_rgba(0,255,255,0.15)]">
            <User className="w-7 h-7 text-blue-400 dark:text-cyan-500" />
          </div>
        )}
        <div className="flex-1 min-w-0 font-mono">
          <div className="text-sm font-bold text-blue-800 dark:text-cyan-300 truncate">
            {user.displayName || "Anonymous User"}
          </div>
          <div className="text-[10px] text-blue-500/70 dark:text-cyan-500/50 truncate">
            {user.email || (user.isAnonymous ? "Anonymous account" : "No email")}
          </div>
          {stats.rank > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Trophy className="w-3 h-3 text-yellow-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-600 dark:text-yellow-400">
                Rank #{stats.rank} of {stats.totalContributors}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
