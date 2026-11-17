import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const checks = [
  ['phone breakpoint exists', /@media\\s*\\(max-width:\\s*700px\\)/.test(css)],
  ['narrow phone breakpoint exists', /@media\\s*\\(max-width:\\s*380px\\)/.test(css)],
  ['timeline resizer disables browser gesture stealing', /\\.tl-resizer[^{]*\\{[^}]*touch-action:\\s*none/s.test(css)],
  ['keyframe handles are touch-safe', /\\.kf,[\\s\\S]*?touch-action:\\s*none/.test(css)],
  ['safe-area inset support exists', /env\\(safe-area-inset-bottom\\)/.test(css)],
  ['keyboard focus indicator exists', /:focus-visible\\s*\\{/.test(css)],
  ['reduced motion preference is respected', /prefers-reduced-motion:\\s*reduce/.test(css)],
  ['viewport fits device safe areas', /viewport-fit=cover/.test(html)],
];
for (const [name, ok] of checks) {
  assert.equal(ok, true, `Mobile regression check failed: ${name}`);
  process.stdout.write(`PASS ${name}\\n`);
}
process.stdout.write(`\\n${checks.length} mobile regression checks passed.\\n`);
