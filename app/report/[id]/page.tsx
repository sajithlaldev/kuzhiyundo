import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getReport, PotholeReport } from "@/lib/firebase-server";
import { decode } from "@googlemaps/polyline-codec";

// Cloudflare Pages requires Edge Runtime for all dynamic routes.
// nodejs_compat flag in wrangler.toml enables Node.js APIs needed by firebase-admin.
export const runtime = "edge";

// ISR: serve from cache; revalidate in background every 24 h.
// Report metadata (address, constituency, severity) is immutable after filing.
// Votes are allowed to be up to 24 h stale on this SEO page.
export const revalidate = 86400;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityLabel(s: PotholeReport["severity"]) {
  return { low: "Low", medium: "Medium", high: "High" }[s] ?? s;
}
function severityColor(s: PotholeReport["severity"]) {
  return { low: "#22c55e", medium: "#f59e0b", high: "#ef4444" }[s] ?? "#94a3b8";
}
function statusLabel(s: PotholeReport["status"]) {
  return { reported: "Reported", confirmed: "Confirmed", fixed: "Fixed" }[s] ?? s;
}

/** Decode polyline and return the midpoint coordinate */
function midpoint(encodedPath: string): [number, number] | null {
  try {
    const pts = decode(encodedPath, 5);
    if (!pts.length) return null;
    const mid = pts[Math.floor(pts.length / 2)];
    return [mid[0], mid[1]];
  } catch {
    return null;
  }
}

function formatDate(ts: PotholeReport["createdAt"]): string {
  if (!ts) return "Unknown date";
  try {
    const d = ts.toDate();
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "Unknown date";
  }
}

function formatDistance(m?: number): string {
  if (!m) return "";
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${m} m`;
}

function buildTitle(r: PotholeReport): string {
  const place = r.address || r.district || "Kerala";
  return `Pothole on ${place} — ${r.acName ?? r.district ?? "Kerala"} | Kuzhiyundo`;
}

function buildDescription(r: PotholeReport): string {
  const parts: string[] = [];
  // Lead with notes if present — user-written text is the most unique SEO signal
  if (r.notes) {
    const snippet = r.notes.length > 120 ? r.notes.slice(0, 117).trimEnd() + "…" : r.notes;
    parts.push(snippet);
  }
  parts.push(`${severityLabel(r.severity)} severity pothole reported on ${formatDate(r.createdAt)}.`);
  parts.push(`Status: ${statusLabel(r.status)}.`);
  if (r.wardName) parts.push(`Located in ${r.wardName} ward, ${r.lsgd ?? ""} ${r.lsgdLabel ? `(${r.lsgdLabel})` : ""}.`);
  if (r.distanceM) parts.push(`${formatDistance(r.distanceM)} road segment affected.`);
  if (r.acName) parts.push(`Assembly constituency: ${r.acName}.`);
  // Trim to 300 chars — Google shows ~155 but longer descriptions can still match snippets
  const full = parts.join(" ").replace(/\s{2,}/g, " ").trim();
  return full.length > 300 ? full.slice(0, 297) + "…" : full;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const r = await getReport(id);
  if (!r) return { title: "Report not found | Kuzhiyundo" };

  const title = buildTitle(r);
  const description = buildDescription(r);
  const url = `https://kuzhiyundo.com/report/${id}`;

  return {
    title,
    description,
    keywords: [
      "pothole",
      r.district,
      r.acName,
      r.lsgd,
      r.wardName,
      "Kerala road damage",
      "kuzhi",
      "road repair",
    ]
      .filter(Boolean)
      .join(", "),
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Kuzhiyundo?",
      locale: "en_IN",
      type: "article",
      images: [
        {
          url: `/report/${id}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/report/${id}/opengraph-image`],
      site: "@kuzhiyundo",
    },
  };
}

// ---------------------------------------------------------------------------
// JSON-LD structured data
// ---------------------------------------------------------------------------

function buildJsonLd(r: PotholeReport, id: string) {
  const coord = midpoint(r.encodedPath);
  const url = `https://kuzhiyundo.com/report/${id}`;
  const votes = (r.upvoterIds?.length ?? 0) - (r.downvoterIds?.length ?? 0);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: buildTitle(r),
    description: buildDescription(r),
    url,
    datePublished: r.createdAt?.toDate?.().toISOString() ?? undefined,
    author: { "@type": "Person", name: r.userName ?? "Anonymous" },
    publisher: {
      "@type": "Organization",
      name: "Kuzhiyundo",
      url: "https://kuzhiyundo.com",
    },
    about: {
      "@type": "Place",
      name: r.address || r.district || "Kerala",
      ...(coord
        ? {
            geo: {
              "@type": "GeoCoordinates",
              latitude: coord[0],
              longitude: coord[1],
            },
          }
        : {}),
      address: {
        "@type": "PostalAddress",
        addressLocality: r.lsgd ?? r.district,
        addressRegion: "Kerala",
        postalCode: r.pincode,
        addressCountry: "IN",
      },
    },
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/LikeAction",
      userInteractionCount: Math.max(0, votes),
    },
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await getReport(id);
  if (!r) notFound();

  const color = severityColor(r.severity);
  const coord = midpoint(r.encodedPath);
  const votes = (r.upvoterIds?.length ?? 0) - (r.downvoterIds?.length ?? 0);
  const osmUrl = coord
    ? `https://www.openstreetmap.org/?mlat=${coord[0]}&mlon=${coord[1]}#map=17/${coord[0]}/${coord[1]}`
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          // Script-safe: replace </ with </ so user-controlled strings
          // (address, userName, etc.) can't break out of the JSON-LD script block.
          __html: JSON.stringify(buildJsonLd(r, id)).replace(/</g, "\\u003c"),
        }}
      />

      <div className="min-h-screen bg-[#020810] text-white font-sans">
        {/* Top accent line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

        {/* Header */}
        <header className="px-6 py-4 flex items-center justify-between border-b border-white/5">
          <Link
            href="/"
            className="text-cyan-400 font-mono text-lg font-bold tracking-tight hover:text-cyan-300 transition-colors"
          >
            Kuzhiyundo?
          </Link>
          <Link
            href="/"
            className="text-xs text-cyan-400/70 border border-cyan-400/20 rounded-full px-4 py-1.5 hover:border-cyan-400/50 hover:text-cyan-400 transition-all font-mono tracking-widest"
          >
            VIEW MAP
          </Link>
        </header>

        <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">

          {/* Severity badge + status */}
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className="text-xs font-mono tracking-widest px-3 py-1 rounded-full border font-bold uppercase"
              style={{
                color,
                borderColor: `${color}40`,
                backgroundColor: `${color}10`,
              }}
            >
              {severityLabel(r.severity)} Severity
            </span>
            <span className="text-xs font-mono tracking-widest px-3 py-1 rounded-full border border-white/10 text-white/50 uppercase">
              {statusLabel(r.status)}
            </span>
            {r.distanceM && (
              <span className="text-xs font-mono text-white/30 tracking-widest">
                {formatDistance(r.distanceM)} affected
              </span>
            )}
          </div>

          {/* Address / title */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-white">
              {r.address || "Pothole Report"}
            </h1>
            {r.district && (
              <p className="text-white/40 mt-1 text-sm font-mono">{r.district}, Kerala</p>
            )}
          </div>

          {/* Location card — links to OpenStreetMap */}
          {osmUrl && coord && (
            <a
              href={osmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition-all group"
            >
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${color}18`, border: `1px solid ${color}40` }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white/70 font-mono truncate">{r.address}</div>
                <div className="text-xs text-white/30 font-mono mt-0.5">
                  {coord[0].toFixed(5)}, {coord[1].toFixed(5)}
                </div>
              </div>
              <div className="text-xs text-cyan-400/50 font-mono tracking-widest group-hover:text-cyan-400 transition-colors flex-shrink-0">
                OSM ↗
              </div>
            </a>
          )}

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: "Reported", value: formatDate(r.createdAt) },
              { label: "Votes", value: votes >= 0 ? `+${votes}` : `${votes}` },
              r.acName ? { label: "Assembly", value: r.acName } : null,
              r.pcName ? { label: "Parliament", value: r.pcName } : null,
              r.lsgd ? { label: r.lsgdLabel ?? "LSGD", value: r.lsgd } : null,
              r.wardName ? { label: "Ward", value: `${r.wardName}${r.wardNo ? ` (#${r.wardNo})` : ""}` } : null,
              r.pincode ? { label: "Pincode", value: r.pincode } : null,
              r.distanceM ? { label: "Length", value: formatDistance(r.distanceM) } : null,
            ]
              .filter(Boolean)
              .map((item) => (
                <div
                  key={item!.label}
                  className="rounded-lg border border-white/8 bg-white/[0.02] px-4 py-3"
                >
                  <div className="text-[10px] font-mono text-white/30 tracking-widest uppercase mb-1">
                    {item!.label}
                  </div>
                  <div className="text-sm font-medium text-white/80 truncate">{item!.value}</div>
                </div>
              ))}
          </div>

          {/* Notes */}
          {r.notes && (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-5 py-4">
              <div className="text-[10px] font-mono text-white/30 tracking-widest uppercase mb-2">
                Notes
              </div>
              <p className="text-sm text-white/70 leading-relaxed">{r.notes}</p>
            </div>
          )}

          {/* Photo */}
          {r.imageUrl && (
            <div className="rounded-xl overflow-hidden border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={r.imageUrl}
                alt={`Photo of pothole on ${r.address}`}
                className="w-full object-cover max-h-80"
              />
            </div>
          )}

          {/* CTA */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              href={`/?id=${id}`}
              className="flex-1 text-center rounded-xl border border-cyan-400/30 bg-cyan-400/5 text-cyan-400 font-mono text-sm py-3.5 tracking-widest hover:bg-cyan-400/10 hover:border-cyan-400/60 transition-all"
            >
              VIEW ON MAP →
            </Link>
            <Link
              href="/"
              className="flex-1 text-center rounded-xl border border-white/10 bg-white/[0.02] text-white/50 font-mono text-sm py-3.5 tracking-widest hover:bg-white/[0.05] hover:text-white/70 transition-all"
            >
              ALL REPORTS
            </Link>
          </div>

          {/* Reporter */}
          <p className="text-xs text-white/20 font-mono">
            Reported by {r.userName ?? "Anonymous"} · kuzhiyundo.com
          </p>
        </main>
      </div>
    </>
  );
}
