import { PDFDocument, type PDFFont, type PDFPage, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import fontkit from "https://esm.sh/@pdf-lib/fontkit@1.1.1";

/**
 * Fills the one-page LSPF remarks template. Coordinates are PDF points
 * measured from the template's top-left (y is flipped for pdf-lib):
 *
 *   Participant Name / Category / Repertoire values start at x 184 (after the
 *   ":"), end at x 555, and sit on each label's baseline (106.1 / 131.6 / 157.1).
 *   Remarks boxes are the right-hand table cells, x 198.9–558.9:
 *   judge 1 y 228.2–444.6, judge 2 y 444.6–661.1, with 12pt padding.
 *
 * Header values shrink from 16pt (the label size) to fit the width, keeping
 * their middle level with the label. Remarks use the largest size between
 * 14pt and 6pt at which the wrapped text fits its box, centred vertically.
 */
const VALUE_X0 = 184;
const VALUE_X1 = 555;
const LABEL_BASELINES = { name: 106.1, category: 131.6, song: 157.1 } as const;
const LABEL_SIZE = 16;
const MIN_LABEL_SIZE = 9;
const CAP_RATIO = 0.7; // Londrina Solid cap height / em
const REMARK_X0 = 198.9;
const REMARK_X1 = 558.9;
const REMARK_ROWS: [number, number][] = [[228.2, 444.6], [444.6, 661.1]];
const PAD = 12;
const LINE_HEIGHT = 1.25;
const MAX_REMARK_SIZE = 14;
const MIN_REMARK_SIZE = 6;
const WHITE = rgb(1, 1, 1);

export interface SheetAssets {
  template: Uint8Array;
  headerFont: Uint8Array; // Londrina Solid Regular
  bodyFont: Uint8Array; // Nunito SemiBold
}

export interface SheetData {
  name: string;
  category: string;
  song: string;
  /** In template row order (top judge first). */
  remarks: [string, string];
}

export async function renderRemarksSheet(assets: SheetAssets, data: SheetData): Promise<Uint8Array> {
  const doc = await PDFDocument.load(assets.template);
  doc.registerFontkit(fontkit);
  const header = await doc.embedFont(assets.headerFont, { subset: true });
  const body = await doc.embedFont(assets.bodyFont, { subset: true });
  const page = doc.getPage(0);
  // Template coordinates are measured down from the visible (crop box) top;
  // this template's media box starts below y 0, so page height is not enough.
  const crop = page.getCropBox();
  const pageTop = crop.y + crop.height;

  for (const key of ["name", "category", "song"] as const) {
    drawHeaderValue(page, header, pageTop, LABEL_BASELINES[key], data[key]);
  }
  data.remarks.forEach((text, i) => {
    const [top, bottom] = REMARK_ROWS[i];
    drawRemarks(page, body, pageTop, top + PAD, bottom - PAD, text);
  });
  return await doc.save();
}

function drawHeaderValue(page: PDFPage, font: PDFFont, pageTop: number, baseline: number, raw: string) {
  const width = VALUE_X1 - VALUE_X0;
  let text = clean(raw);
  let size = LABEL_SIZE;
  while (size > MIN_LABEL_SIZE && font.widthOfTextAtSize(text, size) > width) size -= 0.25;
  if (font.widthOfTextAtSize(text, size) > width) {
    while (text.length > 1 && font.widthOfTextAtSize(`${text}...`, size) > width) text = text.slice(0, -1);
    text = `${text.trimEnd()}...`;
  }
  const y = baseline - ((LABEL_SIZE - size) * CAP_RATIO) / 2;
  page.drawText(text, { x: VALUE_X0, y: pageTop - y, size, font, color: WHITE });
}

function drawRemarks(page: PDFPage, font: PDFFont, pageTop: number, top: number, bottom: number, raw: string) {
  const width = REMARK_X1 - REMARK_X0 - 2 * PAD;
  const boxHeight = bottom - top;
  const text = clean(raw, true);

  // Largest size (0.25pt steps) whose wrapped lines fit the box height.
  let size = MAX_REMARK_SIZE;
  while (size > MIN_REMARK_SIZE && wrap(font, text, size, width).length * size * LINE_HEIGHT > boxHeight) {
    size -= 0.25;
  }

  const lines = wrap(font, text, size, width);
  const leading = size * LINE_HEIGHT;
  const blockTop = top + Math.max(0, (boxHeight - lines.length * leading) / 2);
  const ascent = font.heightAtSize(size, { descender: false });
  lines.forEach((line, i) => {
    const baseline = blockTop + i * leading + ascent + (leading - size) / 2;
    page.drawText(line, { x: REMARK_X0 + PAD, y: pageTop - baseline, size, font, color: WHITE });
  });
}

/** Greedy word wrap; words wider than the box are split by character. */
function wrap(font: PDFFont, text: string, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (let word of paragraph.split(/\s+/).filter(Boolean)) {
      while (font.widthOfTextAtSize(word, size) > width) {
        let cut = word.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(word.slice(0, cut), size) > width) cut--;
        if (line) lines.push(line);
        lines.push(word.slice(0, cut));
        line = "";
        word = word.slice(cut);
      }
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Normalise whitespace; keep newlines only in remarks. */
function clean(text: string, keepNewlines = false): string {
  const t = String(text ?? "").replace(/\r\n?/g, "\n").replace(/[\t\u00a0]/g, " ");
  return (keepNewlines ? t.replace(/\n{3,}/g, "\n\n") : t.replace(/\s+/g, " ")).trim();
}
