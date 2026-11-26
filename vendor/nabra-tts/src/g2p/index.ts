import { cleanPhonemes, EXTRA_SYMBOLS, isDiacritized, normalizeText } from './arabic';
import { espeakPhonemize } from './espeak';
import { VOCAB } from '../vocab';

export { cleanPhonemes, isDiacritized, normalizeText, EXTRA_SYMBOLS } from './arabic';
export { initEspeak } from './espeak';

/** Max phonemes per model call (Kokoro context 512 minus the two pad tokens). */
export const MAX_PHONEMES = 510;
const CHUNK_SIZE = 400;

const TOKENS: Record<string, number> = { ...VOCAB, ...EXTRA_SYMBOLS };

// Python len()/slicing count code points, not UTF-16 units.
const cpLength = (s: string) => Array.from(s).length;

export interface Chunk {
  /** Source text of this chunk. */
  graphemes: string;
  /** IPA phonemes fed to the model. */
  phonemes: string;
  /** Token ids including the leading/trailing 0 pad. */
  inputIds: number[];
  /** Row of the voice pack used as style vector (KPipeline: pack[len(ps) - 1]). */
  styleIndex: number;
}

/** Arabic text -> phonemes, exactly as load_model.load()'s pipeline g2p does it. */
export async function phonemize(text: string): Promise<string> {
  return cleanPhonemes(await espeakPhonemize(text));
}

export function tokenize(phonemes: string): number[] {
  const ids: number[] = [0];
  for (const ch of phonemes) {
    const id = TOKENS[ch];
    if (id !== undefined) ids.push(id);
  }
  ids.push(0);
  return ids;
}

/** KPipeline's non-English chunking: lines, then sentences packed into ~400 char chunks. */
export function splitText(text: string): string[] {
  const out: string[] = [];
  for (const graphemes of text.trim().split(/\n+/)) {
    if (!graphemes.trim()) continue;
    const sentences = graphemes.split(/([.!?]+)/);
    const chunks: string[] = [];
    let current = '';
    for (let i = 0; i < sentences.length; i += 2) {
      let sentence = sentences[i];
      if (i + 1 < sentences.length) sentence += sentences[i + 1];
      if (cpLength(current) + cpLength(sentence) <= CHUNK_SIZE) {
        current += sentence;
      } else {
        if (current) chunks.push(current.trim());
        current = sentence;
      }
    }
    if (current) chunks.push(current.trim());
    if (!chunks.length) {
      const cps = Array.from(graphemes);
      for (let i = 0; i < cps.length; i += CHUNK_SIZE) chunks.push(cps.slice(i, i + CHUNK_SIZE).join(''));
    }
    out.push(...chunks.filter((c) => c.trim()));
  }
  return out;
}

export interface PrepareOptions {
  /** Restore tashkeel before G2P. Skipped for text that is already diacritized. */
  diacritize?: (text: string) => string | Promise<string>;
  /** Drop [citations] and Latin-script runs first (as done for the training data). */
  normalize?: boolean;
}

/** Text -> model-ready chunks. */
export async function prepare(text: string, opts: PrepareOptions = {}): Promise<Chunk[]> {
  const chunks: Chunk[] = [];
  for (let graphemes of splitText(text)) {
    if (opts.normalize) graphemes = normalizeText(graphemes);
    let g2pInput = graphemes;
    if (opts.diacritize && !isDiacritized(graphemes)) g2pInput = await opts.diacritize(graphemes);
    let cps = Array.from(await phonemize(g2pInput));
    if (!cps.length) continue;
    if (cps.length > MAX_PHONEMES) cps = cps.slice(0, MAX_PHONEMES);
    const phonemes = cps.join('');
    chunks.push({ graphemes, phonemes, inputIds: tokenize(phonemes), styleIndex: cps.length - 1 });
  }
  return chunks;
}
