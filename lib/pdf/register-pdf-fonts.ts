import path from "node:path";
import { Font } from "@react-pdf/renderer";

let registered = false;

/** Register Instrument Serif + DM Sans from `assets/fonts/pdf` (OFL, same as the site). */
export function registerDentilyPdfFonts(): void {
  if (registered) return;
  const dir = path.join(process.cwd(), "assets", "fonts", "pdf");

  Font.register({
    family: "Instrument Serif",
    fonts: [
      { src: path.join(dir, "InstrumentSerif-Regular.ttf"), fontWeight: 400 },
      {
        src: path.join(dir, "InstrumentSerif-Italic.ttf"),
        fontWeight: 400,
        fontStyle: "italic",
      },
    ],
  });

  Font.register({
    family: "DM Sans",
    fonts: [
      { src: path.join(dir, "DMSans-Regular.ttf"), fontWeight: 400 },
      { src: path.join(dir, "DMSans-Medium.ttf"), fontWeight: 500 },
      { src: path.join(dir, "DMSans-SemiBold.ttf"), fontWeight: 600 },
    ],
  });

  registered = true;
}
