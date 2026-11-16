import { ImageResponse } from "next/og";
import { OG_SIZE, OgFrame, ogEngraving, ogFonts } from "@/lib/og";

export const alt = "Upper Echelon: a society for sharp minds";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <OgFrame eyebrow="Upper Echelon" title="A society for sharp minds." footer="The Arena · The Directory · The Forum" engraving={await ogEngraving()} />,
    { ...OG_SIZE, fonts: await ogFonts() },
  );
}
