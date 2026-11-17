import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const store = readFileSync(new URL('../src/state/store.ts', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
const boundary = readFileSync(new URL('../src/components/AppErrorBoundary.tsx', import.meta.url), 'utf8');
const checks = [
  ['phone breakpoint exists', css.includes('@media (max-width: 700px)')],
  ['narrow phone breakpoint exists', css.includes('@media (max-width: 380px)')],
  ['timeline resizer disables browser gesture stealing', css.includes('.tl-resizer') && css.includes('touch-action: none')],
  ['keyframe handles are touch-safe', css.includes('.kf,') && css.includes('touch-action: none')],
  ['safe-area inset support exists', css.includes('env(safe-area-inset-bottom)')],
  ['keyboard focus indicator exists', css.includes(':focus-visible')],
  ['reduced motion preference is respected', css.includes('prefers-reduced-motion: reduce')],
  ['viewport fits device safe areas', html.includes('viewport-fit=cover')],
  ['mobile drawer backdrop closes panels', app.includes('className="panel-scrim"') && css.includes('.panel-scrim')],
  ['Escape closes open mobile panels', app.includes("else if (s.leftOpen || s.rightOpen) setState({ leftOpen: false, rightOpen: false });")],
  ['panel expanders expose accessible labels and state', app.includes('aria-label="Show Elements / Library"') && app.includes('aria-label="Show Properties"') && app.includes('aria-expanded={leftOpen}') && app.includes('aria-expanded={rightOpen}')],
  ['editor is protected by a React error boundary', main.includes('<AppErrorBoundary>') && main.includes('</AppErrorBoundary>')],
  ['crash fallback offers reload and error details', boundary.includes('role="alert"') && boundary.includes('window.location.reload()') && boundary.includes('<details>')],
  ['browser title follows the active project name', app.includes('document.title = documentName ? `${documentName} — Animora`') && app.includes('[documentName]')],
  ['autosave recovery snapshot is stored separately', store.includes("AUTOSAVE_BACKUP_KEY = 'animora.autosave.backup.v1'") && app.includes('localStorage.setItem(AUTOSAVE_BACKUP_KEY, previous)')],
  ['startup tries primary and backup autosaves', store.includes('for (const key of [AUTOSAVE_KEY, AUTOSAVE_BACKUP_KEY])')],
  ['damaged primary snapshot does not replace backup', app.includes('migrateDoc(JSON.parse(previous))') && app.includes('Never replace a known-good recovery snapshot')],
];
for (const [name, ok] of checks) {
  assert.equal(ok, true, `Mobile regression check failed: ${name}`);
  process.stdout.write(`PASS ${name}\n`);
}
process.stdout.write(`\n${checks.length} mobile regression checks passed.\n`);
