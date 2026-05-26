import { MetadataRoute } from "next";
import { getAllReportStubs } from "@/lib/firebase-server";

// Force dynamic so the sitemap is regenerated on each request (with ISR cache)
// rather than being statically baked at build time with an empty Firestore snapshot.
export const dynamic = "force-dynamic";
export const revalidate = 3600; // Re-fetch Firestore at most once per hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const reports = await getAllReportStubs();

  const reportUrls: MetadataRoute.Sitemap = reports.map(({ id, updatedAt }) => ({
    url: `https://kuzhiyundo.com/report/${id}`,
    lastModified: updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    {
      url: "https://kuzhiyundo.com",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...reportUrls,
  ];
}
