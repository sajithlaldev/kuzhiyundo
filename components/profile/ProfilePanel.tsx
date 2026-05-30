"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  User,
  Flag,
  ThumbsUp,
  ThumbsDown,
  Trophy,
  LogOut,
  Calendar,
  TrendingUp,
  MapPin,
  Award,
  BarChart3,
  FileText,
  Trash2,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { User as FirebaseUser } from "firebase/auth";

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser;
  reports: any[];
  onLogout: () => void;
  onNavigateToReport?: (reportId: string) => void;
}

interface UserStats {
  totalReports: number;
  totalUpvotes: number;
  totalDownvotes: number;
  netVotes: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  rank: number;
  totalContributors: number;
  firstReportDate: Date | null;
  latestReportDate: Date | null;
  topLocation: string;
}

type PanelView = "profile" | "contributions";

const getColor = (severity?: string) => {
  switch (severity) {
    case "high":
      return "#ff003c";
    case "medium":
      return "#ff9900";
    case "low":
    default:
      return "#00f0ff";
  }
};

export default function ProfilePanel({
  isOpen,
  onClose,
  user,
  reports = [],
  onLogout,
  onNavigateToReport,
}: ProfilePanelProps) {
  const [view, setView] = useState<PanelView>("profile");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingInProgress, setDeletingInProgress] = useState(false);

  const myReports = useMemo(
    () => reports.filter((r) => r.userId === user.uid),
    [reports, user.uid]
  );

  const stats = useMemo<UserStats>(() => {
    let totalUpvotes = 0;
    let totalDownvotes = 0;
    let highSeverity = 0;
    let mediumSeverity = 0;
    let lowSeverity = 0;
    let firstReportDate: Date | null = null;
    let latestReportDate: Date | null = null;
    const locationCounts = new Map<string, number>();

    for (const r of myReports) {
      totalUpvotes += (r.upvoterIds || []).length;
      totalDownvotes += (r.downvoterIds || []).length;

      if (r.severity === "high") highSeverity++;
      else if (r.severity === "medium") mediumSeverity++;
      else lowSeverity++;

      const date = r.createdAt?.toDate?.() || (r.createdAt ? new Date(r.createdAt) : null);
      if (date) {
        if (!firstReportDate || date < firstReportDate) firstReportDate = date;
        if (!latestReportDate || date > latestReportDate) latestReportDate = date;
      }

      const loc = r.district || r.address || "Unknown";
      locationCounts.set(loc, (locationCounts.get(loc) || 0) + 1);
    }

    // Calculate rank among all contributors
    const userReportCounts = new Map<string, number>();
    for (const r of reports) {
      if (!r.userId) continue;
      userReportCounts.set(r.userId, (userReportCounts.get(r.userId) || 0) + 1);
    }
    const sortedCounts = Array.from(userReportCounts.entries())
      .sort((a, b) => b[1] - a[1]);
    const rank = sortedCounts.findIndex(([uid]) => uid === user.uid) + 1;

    // Top location
    let topLocation = "N/A";
    let maxCount = 0;
    locationCounts.forEach((count, loc) => {
      if (count > maxCount) {
        maxCount = count;
        topLocation = loc;
      }
    });

    return {
      totalReports: myReports.length,
      totalUpvotes,
      totalDownvotes,
      netVotes: totalUpvotes - totalDownvotes,
      highSeverity,
      mediumSeverity,
      lowSeverity,
      rank: rank || 0,
      totalContributors: userReportCounts.size,
      firstReportDate,
      latestReportDate,
      topLocation,
    };
  }, [reports, myReports, user.uid]);

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatShortDate = (report: any) => {
    const date = report.createdAt?.toDate?.() || (report.createdAt ? new Date(report.createdAt) : null);
    if (!date) return "—";
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  const handleDelete = async (id: string) => {
    setDeletingInProgress(true);
    try {
      await deleteDoc(doc(db, "potholes", id));
      setDeletingId(null);
    } catch (err) {
      console.error("Failed to delete report:", err);
    } finally {
      setDeletingInProgress(false);
    }
  };

  const handleViewOnMap = (reportId: string) => {
    onNavigateToReport?.(reportId);
    onClose();
  };

  // Reset view when panel closes
  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setView("profile");
      setDeletingId(null);
    }, 300);
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
                    onClick={() => { setView("profile"); setDeletingId(null); }}
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
                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto">
                  {/* User card */}
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

                  {/* Quick Stats */}
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
                      <span className={`text-xl font-bold tabular-nums ${stats.netVotes >= 0 ? "text-blue-700 dark:text-cyan-400" : "text-red-500"}`}>
                        {stats.netVotes >= 0 ? "+" : ""}{stats.netVotes}
                      </span>
                      <span className="text-[8px] uppercase tracking-widest text-blue-500/60 dark:text-cyan-500/40 flex items-center gap-0.5">
                        <TrendingUp className="w-2.5 h-2.5" /> Net Score
                      </span>
                    </div>
                  </div>

                  {/* Severity Breakdown */}
                  {stats.totalReports > 0 && (
                    <div className="px-4 py-3 border-b border-blue-200/50 dark:border-cyan-500/20">
                      <div className="text-[9px] font-mono uppercase tracking-widest text-blue-500/60 dark:text-cyan-500/40 mb-2 flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" /> Severity Breakdown
                      </div>
                      <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-blue-100 dark:bg-cyan-950/50">
                        {stats.highSeverity > 0 && (
                          <div
                            className="bg-[#ff003c] transition-all"
                            style={{ width: `${(stats.highSeverity / stats.totalReports) * 100}%` }}
                            title={`High: ${stats.highSeverity}`}
                          />
                        )}
                        {stats.mediumSeverity > 0 && (
                          <div
                            className="bg-[#ff9900] transition-all"
                            style={{ width: `${(stats.mediumSeverity / stats.totalReports) * 100}%` }}
                            title={`Medium: ${stats.mediumSeverity}`}
                          />
                        )}
                        {stats.lowSeverity > 0 && (
                          <div
                            className="bg-[#00f0ff] transition-all"
                            style={{ width: `${(stats.lowSeverity / stats.totalReports) * 100}%` }}
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
                  )}

                  {/* Details list */}
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
                    onClick={() => { onLogout(); handleClose(); }}
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
              <>
                {/* Summary bar */}
                <div className="flex items-center justify-around px-4 py-2 border-b border-blue-200/50 dark:border-cyan-500/20 bg-blue-50/30 dark:bg-cyan-950/30 font-mono">
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-blue-700 dark:text-cyan-400 tabular-nums">
                      {myReports.length}
                    </span>
                    <span className="text-[9px] uppercase tracking-widest text-blue-500/70 dark:text-cyan-500/50">
                      Total
                    </span>
                  </div>
                  <div className="w-px h-8 bg-blue-200/50 dark:bg-cyan-500/20" />
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-[#ff003c] tabular-nums">
                      {stats.highSeverity}
                    </span>
                    <span className="text-[9px] uppercase tracking-widest text-blue-500/70 dark:text-cyan-500/50">
                      High
                    </span>
                  </div>
                  <div className="w-px h-8 bg-blue-200/50 dark:bg-cyan-500/20" />
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-[#ff9900] tabular-nums">
                      {stats.mediumSeverity}
                    </span>
                    <span className="text-[9px] uppercase tracking-widest text-blue-500/70 dark:text-cyan-500/50">
                      Medium
                    </span>
                  </div>
                  <div className="w-px h-8 bg-blue-200/50 dark:bg-cyan-500/20" />
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold text-[#00f0ff] tabular-nums">
                      {stats.lowSeverity}
                    </span>
                    <span className="text-[9px] uppercase tracking-widest text-blue-500/70 dark:text-cyan-500/50">
                      Low
                    </span>
                  </div>
                </div>

                {/* Report list */}
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
                  {myReports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-blue-400 dark:text-cyan-500/50 font-mono">
                      <Flag className="w-8 h-8 mb-2 opacity-50" />
                      <span className="text-xs uppercase tracking-widest">
                        No contributions yet
                      </span>
                      <span className="text-[10px] mt-1 text-blue-400/60 dark:text-cyan-500/30">
                        Your reports will appear here
                      </span>
                    </div>
                  ) : (
                    myReports.map((report, index) => (
                      <motion.div
                        key={report.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03, duration: 0.25 }}
                        className="border border-blue-200/30 dark:border-cyan-500/20 rounded-lg overflow-hidden font-mono bg-white/50 dark:bg-neutral-900/50 hover:border-blue-300/50 dark:hover:border-cyan-500/30 transition-colors"
                      >
                        {/* Report card */}
                        <div className="px-3 py-2.5 flex items-start gap-2.5">
                          {/* Severity dot */}
                          <div className="shrink-0 mt-1">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: getColor(report.severity),
                                boxShadow: `0 0 8px ${getColor(report.severity)}60`,
                              }}
                            />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-bold text-blue-800 dark:text-cyan-300 truncate leading-tight">
                              {report.address || "Unknown Location"}
                            </div>
                            {report.district && (
                              <div className="text-[9px] text-blue-500/60 dark:text-cyan-500/40 truncate">
                                {report.district}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className="text-[8px] uppercase tracking-wider font-bold px-1 py-px border"
                                style={{
                                  color: getColor(report.severity),
                                  borderColor: getColor(report.severity) + "60",
                                  backgroundColor: getColor(report.severity) + "10",
                                }}
                              >
                                {(report.severity || "low").toUpperCase()}
                              </span>
                              <span className="text-[9px] text-blue-400/60 dark:text-cyan-500/40">
                                {formatShortDate(report)}
                              </span>
                              {((report.upvoterIds || []).length > 0 || (report.downvoterIds || []).length > 0) && (
                                <span className="text-[9px] text-blue-400/60 dark:text-cyan-500/40 flex items-center gap-0.5">
                                  <ThumbsUp className="w-2.5 h-2.5" />
                                  {(report.upvoterIds || []).length - (report.downvoterIds || []).length}
                                </span>
                              )}
                            </div>
                            {report.notes && (
                              <div className="text-[9px] text-blue-600/60 dark:text-cyan-500/40 mt-1 line-clamp-1 italic">
                                &ldquo;{report.notes}&rdquo;
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="shrink-0 flex flex-col gap-1">
                            {onNavigateToReport && (
                              <button
                                onClick={() => handleViewOnMap(report.id)}
                                className="p-1.5 rounded text-blue-400 dark:text-cyan-500/60 hover:text-blue-600 dark:hover:text-cyan-400 hover:bg-blue-100 dark:hover:bg-cyan-900/40 transition-colors"
                                title="View on map"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => setDeletingId(deletingId === report.id ? null : report.id)}
                              className="p-1.5 rounded text-blue-400/50 dark:text-cyan-500/30 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              title="Delete report"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Delete confirmation */}
                        <AnimatePresence>
                          {deletingId === report.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-3 py-2 bg-red-50/80 dark:bg-red-950/30 border-t border-red-200/50 dark:border-red-500/20 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 text-red-500 dark:text-red-400">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">
                                    Delete this report?
                                  </span>
                                </div>
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => setDeletingId(null)}
                                    className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-blue-600 dark:text-cyan-400 bg-white dark:bg-neutral-900 border border-blue-200 dark:border-cyan-500/30 rounded hover:bg-blue-50 dark:hover:bg-cyan-950/50 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleDelete(report.id)}
                                    disabled={deletingInProgress}
                                    className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white bg-red-500 dark:bg-red-600 border border-red-500 dark:border-red-500 rounded hover:bg-red-600 dark:hover:bg-red-500 transition-colors disabled:opacity-50"
                                  >
                                    {deletingInProgress ? "..." : "Delete"}
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))
                  )}
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
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
