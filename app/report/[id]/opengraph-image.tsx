import { ImageResponse } from "next/og";
import { getReport } from "@/lib/firebase-server";

// Cloudflare Pages requires Edge Runtime for all dynamic routes.
export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ISR: OG images are immutable after first generation — revalidate weekly.
export const revalidate = 604800;

const SEVERITY_COLOR = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
} as const;

function severityLabel(s: string) {
  return { low: "LOW", medium: "MEDIUM", high: "HIGH" }[s] ?? s.toUpperCase();
}
function statusLabel(s: string) {
  return { reported: "REPORTED", confirmed: "CONFIRMED", fixed: "FIXED" }[s] ?? s.toUpperCase();
}
function formatDate(ts: { toDate?: () => Date } | null): string {
  if (!ts?.toDate) return "";
  try {
    return ts.toDate().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}
function formatDist(m?: number): string {
  if (!m) return "";
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await getReport(id);

  const color = r ? SEVERITY_COLOR[r.severity] ?? "#94a3b8" : "#00f0ff";
  const address = r?.address ?? "Pothole Report";
  const district = r?.district ? `${r.district}, Kerala` : "Kerala";
  const severity = r ? severityLabel(r.severity) : "";
  const status = r ? statusLabel(r.status) : "";
  const date = r ? formatDate(r.createdAt) : "";
  const dist = r ? formatDist(r.distanceM) : "";
  const constituency = r?.acName ?? "";
  const lsgd = r?.lsgd ?? "";
  const notes = r?.notes ?? "";
  const votes = r ? (r.upvoterIds?.length ?? 0) - (r.downvoterIds?.length ?? 0) : 0;

  const hasPhoto = !!r?.imageUrl;

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(140deg, #020810 0%, #050e1c 55%, #020810 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          position: "relative",
          overflow: "hidden",
          fontFamily: "monospace",
        }}
      >
        {/* Dot grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(0,240,255,0.05) 1.5px, transparent 1.5px)",
            backgroundSize: "44px 44px",
          }}
        />

        {/* Severity glow blob */}
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${color}18 0%, transparent 65%)`,
            right: hasPhoto ? -200 : -100,
            top: -100,
          }}
        />

        {/* Top accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          }}
        />

        {/* ── LEFT: Text content ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minWidth: 0,
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingLeft: 72,
              paddingRight: hasPhoto ? 40 : 72,
              paddingTop: 52,
            }}
          >
            <span style={{ fontSize: 22, color: "#00f0ff", letterSpacing: "2px" }}>Kuzhiyundo?</span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                border: `1px solid ${color}40`,
                borderRadius: 20,
                paddingLeft: 16,
                paddingRight: 16,
                paddingTop: 6,
                paddingBottom: 6,
                background: `${color}0d`,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: color,
                  boxShadow: `0 0 10px ${color}`,
                }}
              />
              <span style={{ fontSize: 13, color, letterSpacing: "3px" }}>
                {severity} SEVERITY
              </span>
            </div>
          </div>

          {/* Main content */}
          <div
            style={{
              display: "flex",
              flex: 1,
              flexDirection: "column",
              justifyContent: "center",
              paddingLeft: 72,
              paddingRight: hasPhoto ? 40 : 72,
            }}
          >
            {/* Address */}
            <div
              style={{
                fontSize: address.length > 60 ? 32 : address.length > 40 ? 40 : 48,
                fontWeight: 800,
                color: "#ffffff",
                lineHeight: 1.15,
                marginBottom: 12,
                maxWidth: hasPhoto ? 620 : 900,
              }}
            >
              {address}
            </div>

            {/* District / constituency */}
            <div
              style={{
                fontSize: 20,
                color: "rgba(255,255,255,0.4)",
                marginBottom: notes ? 20 : 40,
                letterSpacing: "0.5px",
                maxWidth: hasPhoto ? 620 : 900,
              }}
            >
              {constituency ? `${constituency} · ` : ""}{district}
            </div>

            {/* Notes snippet */}
            {notes && (
              <div
                style={{
                  fontSize: 15,
                  color: "rgba(255,255,255,0.55)",
                  marginBottom: 32,
                  maxWidth: hasPhoto ? 580 : 860,
                  lineHeight: 1.5,
                  fontStyle: "italic",
                }}
              >
                &ldquo;{notes.length > 100 ? notes.slice(0, 97) + "…" : notes}&rdquo;
              </div>
            )}

            {/* Stats row */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { label: "STATUS", value: status, color: "#00f0ff" },
                date ? { label: "REPORTED", value: date, color: "rgba(255,255,255,0.5)" } : null,
                dist ? { label: "LENGTH", value: dist, color: "rgba(255,255,255,0.5)" } : null,
                lsgd && !hasPhoto ? { label: "LSGD", value: lsgd, color: "rgba(255,255,255,0.5)" } : null,
                { label: "VOTES", value: votes >= 0 ? `+${votes}` : `${votes}`, color: votes > 0 ? "#22c55e" : "rgba(255,255,255,0.3)" },
              ]
                .filter(Boolean)
                .slice(0, hasPhoto ? 4 : 5)
                .map((item) => (
                  <div
                    key={item!.label}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10,
                      paddingLeft: 16,
                      paddingRight: 16,
                      paddingTop: 10,
                      paddingBottom: 10,
                      minWidth: 90,
                    }}
                  >
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "2.5px" }}>
                      {item!.label}
                    </span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: item!.color, marginTop: 4 }}>
                      {item!.value}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingLeft: 72,
              paddingRight: hasPhoto ? 40 : 72,
              paddingTop: 16,
              paddingBottom: 20,
              borderTop: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <span style={{ fontSize: 14, color: "rgba(0,240,255,0.3)", letterSpacing: "3px" }}>
              kuzhiyundo.com/report/{id.slice(0, 8)}…
            </span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.1)", letterSpacing: "2.5px" }}>
              COMMUNITY POTHOLE TRACKER · KERALA
            </span>
          </div>
        </div>

        {/* ── RIGHT: Photo panel (only when report has an image) ── */}
        {hasPhoto && (
          <div
            style={{
              width: 360,
              flexShrink: 0,
              display: "flex",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Photo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={r!.imageUrl!}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            {/* Fade overlay on left edge to blend with content */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(90deg, #020810 0%, transparent 30%)",
              }}
            />
            {/* Severity badge overlaid on photo */}
            <div
              style={{
                position: "absolute",
                bottom: 20,
                right: 20,
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(2,8,16,0.85)",
                border: `1px solid ${color}50`,
                borderRadius: 8,
                paddingLeft: 10,
                paddingRight: 10,
                paddingTop: 6,
                paddingBottom: 6,
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: color,
                  boxShadow: `0 0 8px ${color}`,
                }}
              />
              <span style={{ fontSize: 11, color, letterSpacing: "2px" }}>
                {severity}
              </span>
            </div>
          </div>
        )}
      </div>
    ),
    { ...size },
  );
}
