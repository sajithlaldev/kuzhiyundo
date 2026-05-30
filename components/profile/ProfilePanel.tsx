"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, User, FileText, LogOut, Flag, ChevronRight } from "lucide-react";

import type { ProfilePanelProps, PanelView } from "./types";
import { computeUserStats } from "./types";
import UserCard from "./UserCard";
import StatsGrid from "./StatsGrid";
import SeverityBreakdown from "./SeverityBreakdown";
import ActivityDetails from "./ActivityDetails";
import ContributionsList from "./ContributionsList";

export default function ProfilePanel({
  isOpen,
  onClose,
  user,
  reports = [],
  onLogout,
  onNavigateToReport,
}: ProfilePanelProps) {
  const [view, setView] = useState<PanelView>("profile");

  const myReports = useMemo(
    () => reports.filter((r) => r.userId === user.uid),
    [reports, user.uid]
  );

  const stats = useMemo(
    () => computeUserStats(myReports, reports, user.uid),
    [reports, myReports, user.uid]
  );

  // Reset view when panel closes
  const handleClose = () => {
    onClose();
    setTimeout(() => setView("profile"), 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2001]"
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm z-[2002] flex flex-col bg-white/95 dark:bg-neutral-950/95 border-l border-blue-200 dark:border-cyan-500/30 shadow-[-4px_0_30px_rgba(0,100,255,0.1)] dark:shadow-[-4px_0_30px_rgba(0,255,255,0.1)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-blue-200 dark:border-cyan-500/30 bg-blue-50/50 dark:bg-cyan-950/50">
              <div className="flex items-center gap-2">
                {view === "profile" ? (
                  <User className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
                ) : (
                  <FileText className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
                )}
                <h2 className="text-sm font-bold uppercase tracking-widest text-blue-800 dark:text-cyan-400 font-mono">
                  {view === "profile" ? "Profile" : "My Contributions"}
                </h2>
              </div>
              <div className="flex items-center gap-1">
                {view === "contributions" && (
                  <button
                    onClick={() => setView("profile")}
                    className="px-2 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider text-blue-500 dark:text-cyan-500 hover:bg-blue-100 dark:hover:bg-cyan-900/40 transition-colors"
                  >
                    ← Back
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded text-blue-500 dark:text-cyan-500 hover:bg-blue-100 dark:hover:bg-cyan-900/40 transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ===== PROFILE VIEW ===== */}
            {view === "profile" && (
              <>
                <div className="flex-1 overflow-y-auto">
                  <UserCard user={user} stats={stats} />
                  <StatsGrid stats={stats} />
                  <SeverityBreakdown stats={stats} />
                  <ActivityDetails stats={stats} />

                  {/* Contributions button */}
                  <div className="px-4 py-3 border-t border-blue-200/50 dark:border-cyan-500/20">
                    <button
                      onClick={() => setView("contributions")}
                      className="w-full flex items-center justify-between gap-2 px-3 py-3 text-[11px] font-bold uppercase tracking-widest font-mono text-blue-700 dark:text-cyan-400 bg-blue-50 dark:bg-cyan-950/40 border border-blue-200 dark:border-cyan-500/30 rounded-lg hover:bg-blue-100 dark:hover:bg-cyan-900/40 hover:border-blue-300 dark:hover:border-cyan-500/50 hover:shadow-[0_0_12px_rgba(0,100,255,0.1)] dark:hover:shadow-[0_0_12px_rgba(0,255,255,0.1)] transition-all group"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>My Contributions</span>
                        <span className="text-[9px] font-normal normal-case px-1.5 py-0.5 rounded bg-blue-200/50 dark:bg-cyan-800/40 text-blue-600 dark:text-cyan-400 tabular-nums">
                          {myReports.length}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-blue-400 dark:text-cyan-500/50 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>

                  {/* Empty state */}
                  {stats.totalReports === 0 && (
                    <div className="px-4 py-8 flex flex-col items-center text-center font-mono">
                      <Flag className="w-10 h-10 text-blue-300 dark:text-cyan-500/30 mb-3" />
                      <div className="text-xs text-blue-600 dark:text-cyan-400 font-bold uppercase tracking-widest mb-1">
                        No reports yet
                      </div>
                      <div className="text-[10px] text-blue-400/70 dark:text-cyan-500/40 max-w-[220px]">
                        Start reporting potholes on the map to see your stats here!
                      </div>
                    </div>
                  )}
                </div>

                {/* Logout button */}
                <div className="px-4 py-3 border-t border-blue-200/50 dark:border-cyan-500/20 bg-blue-50/30 dark:bg-cyan-950/30">
                  <button
                    onClick={() => {
                      onLogout();
                      handleClose();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-[11px] font-bold uppercase tracking-widest font-mono text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30 rounded hover:bg-red-100 dark:hover:bg-red-900/30 hover:border-red-300 dark:hover:border-red-500/50 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}

            {/* ===== CONTRIBUTIONS VIEW ===== */}
            {view === "contributions" && (
              <ContributionsList
                myReports={myReports}
                stats={stats}
                onNavigateToReport={onNavigateToReport}
                onClose={handleClose}
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
