import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Kuzhiyundo? — Community Pothole Tracker for Kerala";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CYAN = "#00f0ff";
const RED = "#ef4444";
const AMBER = "#f59e0b";
const GREEN = "#22c55e";

function Dot({ color, size: s, glow }: { color: string; size: number; glow?: number }) {
  return (
    <div
      style={{
        width: s,
        height: s,
        borderRadius: "50%",
        background: color,
        boxShadow: glow ? `0 0 ${glow}px ${color}` : undefined,
        flexShrink: 0,
      }}
    />
  );
}

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(140deg, #020810 0%, #050e1c 55%, #020810 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
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
            backgroundImage: "radial-gradient(circle, rgba(0,240,255,0.065) 1.5px, transparent 1.5px)",
            backgroundSize: "44px 44px",
          }}
        />

        {/* Radial glow right */}
        <div
          style={{
            position: "absolute",
            width: 700,
            height: 700,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,240,255,0.06) 0%, transparent 65%)",
            right: -80,
            top: -80,
          }}
        />

        {/* Radial glow left-bottom */}
        <div
          style={{
            position: "absolute",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,80,200,0.06) 0%, transparent 70%)",
            left: -60,
            bottom: -100,
          }}
        />

        {/* Top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: "linear-gradient(90deg, transparent 0%, #00f0ff 30%, rgba(0,240,255,0.35) 70%, transparent 100%)",
          }}
        />

        {/* Main row */}
        <div style={{ display: "flex", flex: 1, alignItems: "center", paddingBottom: 52 }}>

          {/* ── LEFT: Content ── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              paddingLeft: 72,
              paddingRight: 32,
              width: 620,
            }}
          >
            {/* Badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                marginBottom: 28,
                background: "rgba(0,240,255,0.07)",
                border: "1px solid rgba(0,240,255,0.18)",
                borderRadius: 24,
                paddingLeft: 16,
                paddingRight: 18,
                paddingTop: 7,
                paddingBottom: 7,
                width: 220,
              }}
            >
              <Dot color={CYAN} size={7} glow={10} />
              <span style={{ fontSize: 13, color: "rgba(0,240,255,0.8)", letterSpacing: "3px" }}>
                COMMUNITY · KERALA
              </span>
            </div>

            {/* Title */}
            <div
              style={{
                fontSize: 94,
                fontWeight: 900,
                color: CYAN,
                letterSpacing: "-3px",
                lineHeight: 1,
                textShadow: `0 0 50px rgba(0,240,255,0.55), 0 0 100px rgba(0,240,255,0.2)`,
                marginBottom: 22,
              }}
            >
              Kuzhiyundo?
            </div>

            {/* Tagline */}
            <div
              style={{
                fontSize: 21,
                color: "rgba(255,255,255,0.5)",
                lineHeight: 1.6,
                marginBottom: 42,
              }}
            >
              Community-powered pothole tracker for Kerala roads.
              Report. Map. Avoid.
            </div>

            {/* Stat pills */}
            <div style={{ display: "flex", gap: 12 }}>
              {[
                { label: "UPDATES", value: "Live", color: CYAN },
                { label: "DISTRICTS", value: "14+", color: AMBER },
                { label: "SEVERITY", value: "H · M · L", color: RED },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${color}30`,
                    borderRadius: 10,
                    paddingLeft: 20,
                    paddingRight: 20,
                    paddingTop: 11,
                    paddingBottom: 11,
                  }}
                >
                  <span style={{ fontSize: 19, fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", letterSpacing: "2px", marginTop: 5 }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Map card ── */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              paddingRight: 60,
            }}
          >
            <div
              style={{
                width: 430,
                height: 410,
                background: "rgba(0,240,255,0.02)",
                border: "1px solid rgba(0,240,255,0.13)",
                borderRadius: 20,
                position: "relative",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Inner grid */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage:
                    "linear-gradient(rgba(0,240,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.035) 1px, transparent 1px)",
                  backgroundSize: "43px 43px",
                }}
              />

              {/* Road H */}
              <div
                style={{
                  position: "absolute",
                  top: 195,
                  left: 0,
                  right: 0,
                  height: 8,
                  background: "rgba(0,240,255,0.1)",
                }}
              />
              {/* Road V */}
              <div
                style={{
                  position: "absolute",
                  left: 200,
                  top: 0,
                  bottom: 0,
                  width: 6,
                  background: "rgba(0,240,255,0.07)",
                }}
              />

              {/* Glowing route: segment 1 */}
              <div
                style={{
                  position: "absolute",
                  top: 310,
                  left: 30,
                  width: 130,
                  height: 3,
                  background: `linear-gradient(90deg, ${CYAN}cc, ${CYAN}55)`,
                  boxShadow: `0 0 14px ${CYAN}99`,
                  borderRadius: 2,
                  transform: "rotate(-28deg)",
                  transformOrigin: "left center",
                }}
              />
              {/* segment 2 */}
              <div
                style={{
                  position: "absolute",
                  top: 195,
                  left: 120,
                  width: 130,
                  height: 3,
                  background: `linear-gradient(90deg, ${CYAN}99, ${CYAN}44)`,
                  boxShadow: `0 0 10px ${CYAN}77`,
                  borderRadius: 2,
                  transform: "rotate(-22deg)",
                  transformOrigin: "left center",
                }}
              />
              {/* segment 3 */}
              <div
                style={{
                  position: "absolute",
                  top: 105,
                  left: 240,
                  width: 130,
                  height: 3,
                  background: `linear-gradient(90deg, ${CYAN}55, ${CYAN}22)`,
                  boxShadow: `0 0 8px ${CYAN}55`,
                  borderRadius: 2,
                  transform: "rotate(-18deg)",
                  transformOrigin: "left center",
                }}
              />

              {/* Marker: HIGH red – center-ish */}
              <div
                style={{
                  position: "absolute",
                  top: 178,
                  left: 185,
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  border: "1.5px solid rgba(239,68,68,0.35)",
                  background: "rgba(239,68,68,0.08)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 186,
                  left: 193,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: RED,
                  boxShadow: `0 0 16px ${RED}cc`,
                }}
              />

              {/* Marker: MEDIUM amber */}
              <div
                style={{
                  position: "absolute",
                  top: 260,
                  left: 80,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: AMBER,
                  boxShadow: `0 0 12px ${AMBER}aa`,
                }}
              />

              {/* Marker: LOW green */}
              <div
                style={{
                  position: "absolute",
                  top: 120,
                  left: 310,
                  width: 13,
                  height: 13,
                  borderRadius: "50%",
                  background: GREEN,
                  boxShadow: `0 0 10px ${GREEN}99`,
                }}
              />

              {/* Marker: MEDIUM amber 2 */}
              <div
                style={{
                  position: "absolute",
                  top: 300,
                  left: 340,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: AMBER,
                  boxShadow: `0 0 10px ${AMBER}99`,
                }}
              />

              {/* Marker: HIGH red 2 */}
              <div
                style={{
                  position: "absolute",
                  top: 330,
                  left: 120,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: RED,
                  boxShadow: `0 0 10px ${RED}99`,
                }}
              />

              {/* LIVE badge */}
              <div
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.28)",
                  borderRadius: 14,
                  paddingLeft: 10,
                  paddingRight: 10,
                  paddingTop: 5,
                  paddingBottom: 5,
                }}
              >
                <Dot color={RED} size={6} glow={6} />
                <span style={{ fontSize: 11, color: "rgba(239,68,68,0.9)", letterSpacing: "2px" }}>LIVE</span>
              </div>

              {/* Report card overlay */}
              <div
                style={{
                  position: "absolute",
                  bottom: 14,
                  left: 14,
                  right: 14,
                  background: "rgba(2,8,16,0.93)",
                  border: "1px solid rgba(0,240,255,0.18)",
                  borderRadius: 10,
                  paddingLeft: 14,
                  paddingRight: 14,
                  paddingTop: 12,
                  paddingBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Dot color={RED} size={10} glow={8} />
                <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                  <span style={{ fontSize: 12, color: "rgba(0,240,255,0.88)", letterSpacing: "0.5px" }}>
                    NH 66, Thiruvananthapuram
                  </span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", marginTop: 3, letterSpacing: "1.5px" }}>
                    HIGH SEVERITY · +12 VOTES
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: "rgba(0,240,255,0.5)",
                    border: "1px solid rgba(0,240,255,0.2)",
                    borderRadius: 4,
                    paddingLeft: 7,
                    paddingRight: 7,
                    paddingTop: 3,
                    paddingBottom: 3,
                    letterSpacing: "1px",
                  }}
                >
                  REPORTED
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingLeft: 72,
            paddingRight: 72,
            paddingTop: 14,
            paddingBottom: 14,
            borderTop: "1px solid rgba(0,240,255,0.07)",
          }}
        >
          <span style={{ fontSize: 14, color: "rgba(0,240,255,0.35)", letterSpacing: "3px" }}>
            kuzhiyundo.com
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.13)", letterSpacing: "2.5px" }}>
            OPEN SOURCE · COMMUNITY DRIVEN
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
