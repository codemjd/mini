// Port of python `phonemizer.punctuation.Punctuation` (preserve / restore), which hides
// punctuation from espeak and re-inserts it afterwards. Kept structurally identical to
// the Python so behaviour matches on edge cases.

const DEFAULT_MARKS = ';:,.!?¡¿—…"«»“”(){}[]';

const escapeClass = (s: string) => s.replace(/[\\\]\[^-]/g, '\\$&');
const MARKS_RE = new RegExp(`(\\s*[${escapeClass(DEFAULT_MARKS)}]+\\s*)+`, 'gu');

type Position = 'B' | 'E' | 'I' | 'A';
export interface MarkIndex {
  index: number;
  mark: string;
  position: Position;
}

function preserveLine(line: string, num: number): [string[], MarkIndex[]] {
  const matches = [...line.matchAll(MARKS_RE)];
  if (matches.length === 0) return [[line], []];
  if (matches.length === 1 && matches[0][0] === line) return [[], [{ index: num, mark: line, position: 'A' }]];

  const marks: MarkIndex[] = matches.map((m, i) => {
    let position: Position = 'I';
    if (i === 0 && line.startsWith(m[0])) position = 'B';
    else if (i === matches.length - 1 && line.endsWith(m[0])) position = 'E';
    return { index: num, mark: m[0], position };
  });

  const preserved: string[] = [];
  for (const mark of marks) {
    const split = line.split(mark.mark);
    preserved.push(split[0]);
    line = split.slice(1).join(mark.mark);
  }
  return [[...preserved, line], marks];
}

export function preserve(lines: string[]): [string[], MarkIndex[]] {
  const text: string[] = [];
  const marks: MarkIndex[] = [];
  lines.forEach((line, num) => {
    const [l, m] = preserveLine(line, num);
    text.push(...l);
    marks.push(...m);
  });
  return [text.filter(Boolean), marks];
}

/** Inverse of preserve(), with the default separator (word = ' ') and strip = false. */
export function restore(text: string[], marks: MarkIndex[]): string[] {
  const sep = ' ';
  text = [...text];
  marks = [...marks];
  const out: string[] = [];
  let pos = 0;
  while (text.length || marks.length) {
    if (!marks.length) {
      for (let line of text) {
        if (!line.endsWith(sep)) line += sep;
        out.push(line);
      }
      text = [];
    } else if (!text.length) {
      out.push(marks.map((m) => m.mark).join(''));
      marks = [];
    } else {
      const current = marks[0];
      if (current.index === pos) {
        const mark = current.mark;
        marks = marks.slice(1);
        if (text[0].endsWith(sep)) text[0] = text[0].slice(0, -sep.length);
        if (current.position === 'B') {
          text[0] = mark + text[0];
        } else if (current.position === 'E') {
          out.push(text[0] + mark + (mark.endsWith(sep) ? '' : sep));
          text = text.slice(1);
          pos += 1;
        } else if (current.position === 'A') {
          out.push(mark + (mark.endsWith(sep) ? '' : sep));
          pos += 1;
        } else if (text.length === 1) {
          text[0] = text[0] + mark;
        } else {
          const first = text[0];
          text = text.slice(1);
          text[0] = first + mark + text[0];
        }
      } else {
        out.push(text[0]);
        text = text.slice(1);
        pos += 1;
      }
    }
  }
  return out;
}
