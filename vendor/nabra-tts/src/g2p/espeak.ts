// espeak-ng (Arabic-only WASM build, see espeak/build.sh) plus the post-processing that
// python `phonemizer.EspeakBackend(preserve_punctuation=True, with_stress=True, tie='^',
// language_switch='remove-flags')` and `misaki.espeak.EspeakG2P` apply on top of it.
import { preserve, restore } from './punctuation';

interface EspeakModule {
  ccall(name: string, ret: 'number' | 'string', argTypes: string[], args: unknown[]): any;
}

// IPA output (0x02) | use a tie char (bit 7) | tie char U+0361 in bits 8+.
// Same flags phonemizer passes to espeak_TextToPhonemes for tie=True.
const PHONEME_MODE = 0x02 | (1 << 7) | (0x0361 << 8);

// misaki EspeakG2P e2m, applied in sorted key order as in Python.
const E2M: [string, string][] = Object.entries({
  'a^ɪ': 'I', 'a^ʊ': 'W',
  'd^z': 'ʣ', 'd^ʒ': 'ʤ',
  'e^ɪ': 'A',
  'o^ʊ': 'O', 'ə^ʊ': 'Q',
  's^s': 'S',
  't^s': 'ʦ', 't^ʃ': 'ʧ',
  'ɔ^ɪ': 'Y',
}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

let modulePromise: Promise<EspeakModule> | null = null;

function loadEspeak(): Promise<EspeakModule> {
  modulePromise ??= import('../vendor/espeak-ng-ar.mjs').then(async ({ default: createEspeak }) => {
    const mod: EspeakModule = await createEspeak();
    const rc = mod.ccall('nabra_init', 'number', ['string', 'string'], ['/espeak-ng-data', 'ar']);
    if (rc !== 0) throw new Error(`espeak-ng init failed (${rc})`);
    return mod;
  });
  return modulePromise;
}

/** Load the espeak WASM ahead of time (otherwise loaded on first phonemize). */
export async function initEspeak(): Promise<void> {
  await loadEspeak();
}

const replaceAll = (s: string, a: string, b: string) => s.split(a).join(b);

// phonemizer EspeakBackend._postprocess_line with separator word=' ', strip=False, tie='^'.
function postprocessLine(line: string): string {
  line = replaceAll(line.trim().replace(/\n/g, ' '), '  ', ' ');
  line = line.replace(/_+/g, '_').replace(/_ /g, ' ');
  line = line.replace(/\(.+?\)/g, ''); // language_switch='remove-flags'
  if (!line) return '';
  let out = '';
  for (const word of line.split(' ')) out += replaceAll(word.trim(), '͡', '^') + ' ';
  return out;
}

/** Equivalent of misaki `EspeakG2P(language='ar')(text)[0]`. */
export async function espeakPhonemize(text: string): Promise<string> {
  const mod = await loadEspeak();
  text = text.replace(/«/g, '“').replace(/»/g, '”');
  text = text.replace(/\(/g, '«').replace(/\)/g, '»');

  const [chunks, marks] = preserve([text]);
  const phonemized = chunks.map((chunk) =>
    postprocessLine(mod.ccall('nabra_text_to_phonemes', 'string', ['string', 'number'], [chunk, PHONEME_MODE])),
  );
  const restored = restore(phonemized, marks);
  if (!restored.length) return '';

  let ps = restored[0].trim();
  for (const [a, b] of E2M) ps = replaceAll(ps, a, b);
  ps = replaceAll(ps, '^', '');
  ps = replaceAll(ps, '-', '');
  return ps.replace(/«/g, '(').replace(/»/g, ')');
}
