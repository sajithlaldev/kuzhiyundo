import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Kuzhiyundo? — Community Pothole Tracker for Kerala";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0f172a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Grid lines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(0,240,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.05) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Glow blob */}
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,240,255,0.08) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Road segment illustration */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 32, gap: 0 }}>
          {/* Road */}
          <div
            style={{
              width: 180,
              height: 8,
              background: "rgba(0,240,255,0.3)",
              borderRadius: 4,
              boxShadow: "0 0 20px rgba(0,240,255,0.6)",
            }}
          />
          {/* Pothole */}
          <div
            style={{
              width: 36,
              height: 24,
              borderRadius: "50%",
              background: "#0a0f1e",
              border: "3px solid rgba(0,240,255,0.5)",
              boxShadow: "0 0 16px rgba(0,240,255,0.4), inset 0 2px 8px rgba(0,0,0,0.8)",
              margin: "0 4px",
            }}
          />
          <div
            style={{
              width: 180,
              height: 8,
              background: "rgba(0,240,255,0.3)",
              borderRadius: 4,
              boxShadow: "0 0 20px rgba(0,240,255,0.6)",
            }}
          />
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 88,
            fontWeight: 900,
            color: "#00f0ff",
            letterSpacing: "-3px",
            textShadow: "0 0 40px rgba(0,240,255,0.6)",
            lineHeight: 1,
          }}
        >
          Kuzhiyundo?
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 26,
            color: "rgba(0,240,255,0.55)",
            marginTop: 20,
            letterSpacing: "6px",
            textTransform: "uppercase",
          }}
        >
          Community Pothole Tracker · Kerala
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: 36,
            fontSize: 18,
            color: "rgba(0,240,255,0.3)",
            letterSpacing: "3px",
          }}
        >
          kuzhiyundo.com
        </div>

        {/* Corner accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 120,
            height: 4,
            background: "linear-gradient(90deg, #00f0ff, transparent)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 120,
            height: 4,
            background: "linear-gradient(270deg, #00f0ff, transparent)",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
