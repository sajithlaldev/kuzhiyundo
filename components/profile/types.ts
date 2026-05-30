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

export interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser;
  reports: any[];
  onLogout: () => void;
  onNavigateToReport?: (reportId: string) => void;
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

export const formatDate = (date: Date | null) => {
  if (!date) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatShortDate = (report: any) => {
  const date =
    report.createdAt?.toDate?.() ||
    (report.createdAt ? new Date(report.createdAt) : null);
  if (!date) return "—";
  return date.toLocaleDateString(undefined, {
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

    const date =
      r.createdAt?.toDate?.() || (r.createdAt ? new Date(r.createdAt) : null);
    if (date) {
      if (!firstReportDate || date < firstReportDate) firstReportDate = date;
      if (!latestReportDate || date > latestReportDate) latestReportDate = date;
    }

    const loc = r.district || r.address || "Unknown";
    locationCounts.set(loc, (locationCounts.get(loc) || 0) + 1);
  }

  // Calculate rank among all contributors
  const userReportCounts = new Map<string, number>();
  for (const r of allReports) {
    if (!r.userId) continue;
    userReportCounts.set(r.userId, (userReportCounts.get(r.userId) || 0) + 1);
  }
  const sortedCounts = Array.from(userReportCounts.entries()).sort(
    (a, b) => b[1] - a[1]
  );
  const rank = sortedCounts.findIndex(([uid]) => uid === userId) + 1;

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
}
