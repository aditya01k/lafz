import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the logo mark, full bleed (iOS rounds the corners itself). */
export default function AppleIcon() {
  const bar = (left: number, top: number, width: number, color: string, opacity = 1) => (
    <div style={{ position: "absolute", left, top, width, height: 22, borderRadius: 11, background: color, opacity }} />
  );
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#3a1515", position: "relative", display: "flex" }}>
        {bar(37, 62, 45, "#ffc531")}
        {bar(90, 62, 53, "#f6efe7")}
        {bar(37, 96, 76, "#f6efe7", 0.55)}
      </div>
    ),
    size,
  );
}
