import { readFile } from "node:fs/promises";
import path from "node:path";

/** Shared pieces for generated Open Graph images (1200×630). */
export const OG_SIZE = { width: 1200, height: 630 };

export async function ogFonts() {
  const dir = path.join(process.cwd(), "src/assets/fonts");
  const [serif, serifMedium, sans] = await Promise.all([
    readFile(path.join(dir, "CormorantGaramond-Regular.ttf")),
    readFile(path.join(dir, "CormorantGaramond-Medium.ttf")),
    readFile(path.join(dir, "InstrumentSans-Regular.ttf")),
  ]);
  return [
    { name: "Cormorant", data: serif, weight: 400 as const, style: "normal" as const },
    { name: "Cormorant", data: serifMedium, weight: 500 as const, style: "normal" as const },
    { name: "Instrument", data: sans, weight: 400 as const, style: "normal" as const },
  ];
}

export async function ogEngraving(): Promise<string> {
  const png = await readFile(path.join(process.cwd(), "public/brand/engraving-ivory.png"));
  return `data:image/png;base64,${png.toString("base64")}`;
}

export function OgFrame({ eyebrow, title, footer, engraving }: { eyebrow: string; title: string; footer: string; engraving: string }) {
  const size = title.length > 70 ? 62 : title.length > 40 ? 76 : 92;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#0b0b0a", color: "#edeae3", fontFamily: "Instrument" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 0 56px 72px", width: 760 }}>
        <div style={{ display: "flex", fontSize: 28, color: "#a39f96" }}>{eyebrow}</div>
        <div style={{ display: "flex", fontFamily: "Cormorant", fontSize: size, lineHeight: 1.02, letterSpacing: -1 }}>{title}</div>
        <div style={{ display: "flex", fontSize: 26, color: "#c2a15f" }}>{footer}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 440, background: "#121211" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={engraving} width={400} height={300} style={{ objectFit: "contain", opacity: 0.9 }} alt="" />
      </div>
    </div>
  );
}
