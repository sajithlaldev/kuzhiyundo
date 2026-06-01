import type { User as FirebaseUser } from "firebase/auth";

export interface UserStats {
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

/** A user whose profile is being viewed (used when it isn't the logged-in user). */
export interface ProfileSubject {
  uid: string;
  name: string;
  photoURL?: string;
}

export interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** The logged-in user, or null when signed out / anonymous viewing a public profile. */
  user: FirebaseUser | null;
  reports: any[];
  onLogout: () => void;
  onNavigateToReport?: (reportId: string) => void;
  /** When set, view this user's public profile instead of the logged-in user's. */
  subject?: ProfileSubject;
}

export type PanelView = "profile" | "contributions";

export const getColor = (severity?: string) => {
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

export const parseFirestoreDate = (createdAt: any): Date | null => {
  if (!createdAt) return null;
  if (typeof createdAt.toDate === "function") return createdAt.toDate();
  if (typeof createdAt.seconds === "number") return new Date(createdAt.seconds * 1000);
  const date = new Date(createdAt);
  return isNaN(date.getTime()) ? null : date;
};

export const formatDate = (date: Date | null) => {
  if (!date) return "—";
  return date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatShortDate = (report: any) => {
  const date = parseFirestoreDate(report.createdAt);
  if (!date) return "—";
  return date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
};

export function computeUserStats(
  myReports: any[],
  allReports: any[],
  userId: string
): UserStats {
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

    const date = parseFirestoreDate(r.createdAt);
    if (date) {
      if (!firstReportDate || date < firstReportDate) firstReportDate = date;
      if (!latestReportDate || date > latestReportDate) latestReportDate = date;
    }

    const loc = r.district || r.address || "Unknown";
    locationCounts.set(loc, (locationCounts.get(loc) || 0) + 1);
  }

  // Calculate rank among all contributors.
  // Score = reportCount + netVotes (upvotes − downvotes), tiebroken by
  // reportCount — matches the leaderboard ranking in LeaderboardPanel.
  const userScores = new Map<string, { score: number; reportCount: number }>();
  for (const r of allReports) {
    if (!r.userId) continue;
    const upvotes = (r.upvoterIds || []).length;
    const downvotes = (r.downvoterIds || []).length;
    const agg = userScores.get(r.userId) || { score: 0, reportCount: 0 };
    agg.score += 1 + upvotes - downvotes;
    agg.reportCount += 1;
    userScores.set(r.userId, agg);
  }
  const sortedScores = Array.from(userScores.entries()).sort((a, b) => {
    if (b[1].score !== a[1].score) return b[1].score - a[1].score;
    return b[1].reportCount - a[1].reportCount;
  });
  const rank = sortedScores.findIndex(([uid]) => uid === userId) + 1;

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
    totalContributors: userScores.size,
    firstReportDate,
    latestReportDate,
    topLocation,
  };
}
