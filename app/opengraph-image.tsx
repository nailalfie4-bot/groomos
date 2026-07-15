import { ImageResponse } from "next/og";

// A simple, on-brand 1200x630 preview card for links shared in DMs.
export const runtime = "nodejs";
export const alt = "GroomOS — one no-show costs you £45, GroomOS costs £29";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#FCF6F4",
          padding: "76px 84px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand lockup */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", height: 52, width: 52, borderRadius: 16, backgroundColor: "#C9756B" }} />
          <div style={{ fontSize: 34, fontWeight: 700, color: "#2A2422", letterSpacing: -0.5 }}>GroomOS</div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 82, fontWeight: 800, color: "#2A2422", lineHeight: 1.04, letterSpacing: -2 }}>
            One no-show costs you £45.
          </div>
          <div style={{ fontSize: 82, fontWeight: 800, color: "#C9756B", lineHeight: 1.04, letterSpacing: -2 }}>
            GroomOS costs £29.
          </div>
        </div>

        {/* Subline */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 30, color: "#8A7470" }}>
            Online booking · reminders · fewer no-shows — for UK dog groomers
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
