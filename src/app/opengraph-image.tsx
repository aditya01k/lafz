import { ImageResponse } from "next/og";

export const alt = "Lafz: open-source captions for every Indian language";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function font(family: string, weight: number, italic = false) {
  // Google Fonts CSS → the font file, so the card uses the site's own type.
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:${italic ? "ital,wght@1," : "wght@"}${weight}&display=swap`,
    { headers: { "User-Agent": "Mozilla/5.0 (Macintosh) AppleWebKit/533.21 (KHTML, like Gecko) Version/5.0 Safari/533.21" } },
  ).then((r) => r.text());
  const url = css.match(/src: url\((.+?)\) format/)?.[1];
  return url ? fetch(url).then((r) => r.arrayBuffer()) : null;
}

/** The share card: the site's hero in miniature, with a caption mock on the right. */
export default async function OgImage() {
  const [geist, geistBold, serif, anton] = await Promise.all([
    font("Geist", 400),
    font("Geist", 600),
    font("Instrument Serif", 400, true),
    font("Anton", 400),
  ]);
  const fonts = [
    geist && { name: "Geist", data: geist, weight: 400 as const },
    geistBold && { name: "Geist", data: geistBold, weight: 600 as const },
    serif && { name: "Serif", data: serif, style: "italic" as const },
    anton && { name: "Anton", data: anton },
  ].filter(Boolean) as { name: string; data: ArrayBuffer }[];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#ece6dc", color: "#1d1714", fontFamily: "Geist", padding: 64 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 34, fontWeight: 600, letterSpacing: -1 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "#3a1515", position: "relative", display: "flex" }}>
              <div style={{ position: "absolute", left: 10, top: 16, width: 12, height: 6, borderRadius: 3, background: "#ffc531" }} />
              <div style={{ position: "absolute", left: 24, top: 16, width: 14, height: 6, borderRadius: 3, background: "#f6efe7" }} />
              <div style={{ position: "absolute", left: 10, top: 26, width: 20, height: 6, borderRadius: 3, background: "#f6efe7", opacity: 0.55 }} />
            </div>
            lafz
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 76, lineHeight: 1.02, letterSpacing: -3.5 }}>
            <div style={{ display: "flex" }}>Captions for every</div>
            <div style={{ display: "flex", gap: 18 }}>
              <span style={{ fontFamily: "Serif", fontStyle: "italic", letterSpacing: -1 }}>Indian</span>
              <span style={{ color: "#6f645c" }}>language.</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 24 }}>
            <div style={{ display: "flex", background: "#3a1515", color: "#fff", borderRadius: 999, padding: "10px 22px" }}>Open source · ₹0 to self-host</div>
            <div style={{ display: "flex", background: "#fff", borderRadius: 999, padding: "10px 22px", border: "1px solid rgba(29,23,20,0.12)" }}>
              11 languages
            </div>
          </div>
        </div>
        <div
          style={{
            width: 300,
            height: 502,
            borderRadius: 40,
            background: "linear-gradient(160deg, #7a1f5c 0%, #1b0f2e 100%)",
            border: "10px solid #000",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Anton",
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex", fontSize: 72, lineHeight: 1, color: "#ffe600" }}>JAGAH</div>
          <div style={{ display: "flex", fontSize: 72, lineHeight: 1, color: "#fff" }}>EKDUM</div>
          <div style={{ display: "flex", fontFamily: "Geist", fontSize: 20, color: "rgba(255,255,255,0.7)", marginTop: 26, textTransform: "none" }}>
            kya scene hai · क्या सीन है
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
