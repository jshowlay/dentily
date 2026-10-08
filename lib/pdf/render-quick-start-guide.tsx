import { createElement, type ReactElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { QuickStartGuide, type QuickStartGuideProps } from "@/lib/pdf/QuickStartGuide";
import { registerDentilyPdfFonts } from "@/lib/pdf/register-pdf-fonts";

export async function renderQuickStartGuideBuffer(
  props: QuickStartGuideProps
): Promise<Buffer> {
  registerDentilyPdfFonts();
  return renderToBuffer(createElement(QuickStartGuide, props) as ReactElement);
}
