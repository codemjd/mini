// Port of arabic_g2p.py from oddadmix/Nabra-7M-Distill (normalize / tashkeel detection /
// phoneme clean-up). Keep in sync with the Python: the model was trained on its output.

/** Out-of-vocab espeak phonemes folded into in-vocab ones (or stripped). */
export const ARABIC_PHONEME_FIXUPS: Record<string, string> = {
  '̪': '', // ◌̪ combining bridge below (dental)
  'ˤ': '', // pharyngealization marker
  '[': '',
  ']': '',
  '{': '',
  '}': '',
};

/** ʕ (ع) and ħ (ح) were trained on Kokoro vocab gap slots 7 and 8. */
export const EXTRA_SYMBOLS: Record<string, number> = { ʕ: 7, ħ: 8 };

const SYLLABLE_DOT = /(?<=\S)\.(?=\S)/g;
const LATIN_RUN = /[A-Za-z]+/g;
const CITATION = /\[[^\]]*\]/g;
const WS = /\s+/g;
const TASHKEEL = /[ً-ْٰ]/g;
const ARABIC_LETTER = /[ء-ي]/g;

/** True if the text already carries enough tashkeel to trust and use as-is. */
export function isDiacritized(text: string, minRatio = 0.2): boolean {
  const letters = text.match(ARABIC_LETTER)?.length ?? 0;
  const marks = text.match(TASHKEEL)?.length ?? 0;
  return letters > 0 && marks / letters >= minRatio;
}

/** Drop citation markers like [12] and Latin-script runs, tidy whitespace. */
export function normalizeText(text: string): string {
  return text.replace(CITATION, ' ').replace(LATIN_RUN, ' ').replace(WS, ' ').trim();
}

/** Strip espeak syllable-boundary dots and remap out-of-vocab phonemes. */
export function cleanPhonemes(ps: string): string {
  ps = ps.replace(SYLLABLE_DOT, '');
  for (const [from, to] of Object.entries(ARABIC_PHONEME_FIXUPS)) ps = ps.split(from).join(to);
  return ps;
}
