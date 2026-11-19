import { useEffect, useRef, useState } from 'react';
import { useStore, getState, setState, setTheme, setView } from '../state/store';
import { loadDoc, newProject, patchDoc, redo, reorderSelection, setTool, undo } from '../state/actions';
import { groupSelection, mergeSelection, ungroupSelection } from '../state/structure';
import { centerOrigin, clearGuides, createMask, flipSelection, rotateSelection } from '../state/editing';
import { demoDoc } from '../model/factory';
import { saveProject } from '../io/files';
import type { Tool } from '../model/types';
import { canvasApi } from './canvasApi';
import { Icon } from './Icon';

interface Props {
  onOpen: () => void;
  onImport: () => void;
  onExport: () => void;
  onHelp: () => void;
}

export interface ToolDef {
  id: Tool;
  icon: string;
  label: string;
  key: string;
}

const PRIMARY_TOOL_GROUPS: { id: string; tools: ToolDef[] }[] = [
  { id: 'select', tools: [{ id: 'select', icon: 'select', label: 'Select & move', key: 'V' }] },
  { id: 'shapes', tools: [
    { id: 'rect', icon: 'rect', label: 'Rectangle', key: 'R' },
    { id: 'ellipse', icon: 'ellipse', label: 'Circle / ellipse', key: 'E' },
  ] },
  { id: 'text', tools: [{ id: 'text', icon: 'text', label: 'Text', key: 'T' }] },
  { id: 'hand', tools: [{ id: 'hand', icon: 'hand', label: 'Move canvas', key: 'H' }] },
];

const ADVANCED_TOOLS: ToolDef[] = [
  { id: 'node', icon: 'node', label: 'Edit nodes', key: 'A' },
  { id: 'pen', icon: 'pen', label: 'Draw path', key: 'P' },
  { id: 'line', icon: 'line', label: 'Line', key: 'L' },
  { id: 'polygon', icon: 'polygon', label: 'Polygon', key: 'G' },
  { id: 'star', icon: 'star', label: 'Star', key: 'S' },
];

/** All tools remain available to keyboard shortcuts, but advanced tools stay out of the main toolbar. */
export const TOOLS = [...PRIMARY_TOOL_GROUPS.flatMap((group) => group.tools), ...ADVANCED_TOOLS];

/** Click-outside popover anchored to a button. */
export function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', h);
    window.addEventListener('keydown', k);
    return () => {
      window.removeEventListener('pointerdown', h);
      window.removeEventListener('keydown', k);
    };
  }, [open]);
  return { open, setOpen, ref };
}

function ToolGroup({ tools }: { tools: ToolDef[] }) {
  const tool = useStore((s) => s.tool);
  const [last, setLast] = useState(tools[0].id);
  const dd = useDropdown();
  const active = tools.find((t) => t.id === tool);
  const shown = active ?? tools.find((t) => t.id === last) ?? tools[0];
  useEffect(() => {
    if (active) setLast(active.id);
  }, [active]);
  return (
    <div className="tool-group" ref={dd.ref}>
      <button className={`tb-btn ${active ? 'active' : ''}`} onClick={() => setTool(shown.id)} title={`${shown.label} (${shown.key})`}>
        <Icon name={shown.icon} size={18} />
      </button>
      {tools.length > 1 && (
        <button className={`tb-caret ${active ? 'active' : ''}`} onClick={() => dd.setOpen(!dd.open)} aria-label="More tools">
          <Icon name="chevD" size={10} />
        </button>
      )}
      {dd.open && (
        <div className="menu-pop">
          {tools.map((t) => (
            <button key={t.id} className={`menu-item ${tool === t.id ? 'checked' : ''}`} onClick={() => { setTool(t.id); dd.setOpen(false); }}>
              <span className="mi-icon"><Icon name={t.icon} size={14} /></span>
              <span className="mi-label">{t.label}</span>
              <kbd>{t.key}</kbd>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TB({ icon, title, onClick, disabled, active }: { icon: string; title: string; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button className={`tb-btn ${active ? 'active' : ''}`} onClick={onClick} disabled={disabled} title={title}>
      <Icon name={icon} size={18} />
    </button>
  );
}

function Check({ on, label, kbd, onClick }: { on: boolean; label: string; kbd?: string; onClick: () => void }) {
  return (
    <button className="menu-item" onClick={onClick}>
      <span className="mi-icon">{on && <Icon name="check" size={14} />}</span>
      <span className="mi-label">{label}</span>
      {kbd && <kbd>{kbd}</kbd>}
    </button>
  );
}

function MoreMenu({ any, selectionCount }: { any: boolean; selectionCount: number }) {
  const dd = useDropdown();
  const view = useStore((s) => s.view);
  const chooseTool = (tool: Tool) => { setTool(tool); dd.setOpen(false); };
  const action = (label: string, run: () => void, disabled = false) => (
    <button className="menu-item" disabled={disabled} onClick={() => { run(); dd.setOpen(false); }}>
      <span className="mi-icon" /><span className="mi-label">{label}</span>
    </button>
  );
  return (
    <div className="tool-group" ref={dd.ref}>
      <button className="tb-btn" onClick={() => dd.setOpen(!dd.open)} title="More tools and options" aria-label="More tools and options" aria-expanded={dd.open}>
        <Icon name="more" size={18} />
      </button>
      {dd.open && (
        <div className="menu-pop">
          <div className="menu-heading">Advanced drawing</div>
          {ADVANCED_TOOLS.map((tool) => (
            <button key={tool.id} className="menu-item" onClick={() => chooseTool(tool.id)}>
              <span className="mi-icon"><Icon name={tool.icon} size={14} /></span>
              <span className="mi-label">{tool.label}</span><kbd>{tool.key}</kbd>
            </button>
          ))}
          <div className="menu-sep" />
          <div className="menu-heading">Arrange selection</div>
          {action('Bring forward', () => reorderSelection('up'), !any)}
          {action('Send backward', () => reorderSelection('down'), !any)}
          {action('Group', groupSelection, selectionCount < 2)}
          {action('Ungroup', ungroupSelection, !any)}
          {action('Create mask', createMask, selectionCount < 2)}
          {action('Merge into path', mergeSelection, selectionCount < 2)}
          {action('Center transform origin', centerOrigin, !any)}
          {action('Flip horizontally', () => flipSelection('h'), !any)}
          {action('Flip vertically', () => flipSelection('v'), !any)}
          {action('Rotate 90° left', () => rotateSelection(-90), !any)}
          {action('Rotate 90° right', () => rotateSelection(90), !any)}
          <div className="menu-sep" />
          <div className="menu-heading">Canvas helpers</div>
          <Check on={view.snap} label="Smart snapping" kbd="Alt+S" onClick={() => setView({ snap: !view.snap })} />
          <Check on={view.showGrid} label="Show grid" kbd="Alt+G" onClick={() => setView({ showGrid: !view.showGrid })} />
          <Check on={view.showRulers} label="Show rulers" kbd="Alt+R" onClick={() => setView({ showRulers: !view.showRulers })} />
          <Check on={view.showGuides} label="Show guides" kbd="Alt+L" onClick={() => setView({ showGuides: !view.showGuides })} />
          {action('Clear all guides', clearGuides)}
        </div>
      )}
    </div>
  );
}

function AppMenu({ onOpen, onImport, onExport, onHelp }: Props) {
  const dd = useDropdown();
  const theme = useStore((s) => s.theme);
  const item = (label: string, run: () => void, kbd?: string, icon?: string) => (
    <button className="menu-item" onClick={() => { dd.setOpen(false); run(); }}>
      <span className="mi-icon">{icon && <Icon name={icon} size={14} />}</span>
      <span className="mi-label">{label}</span>
      {kbd && <kbd>{kbd}</kbd>}
    </button>
  );
  return (
    <div className="tool-group" ref={dd.ref}>
      <button className="brand-btn" onClick={() => dd.setOpen(!dd.open)} title="Menu">
        <img src="./favicon.svg" alt="Animora" width={26} height={26} />
      </button>
      {dd.open && (
        <div className="menu-pop">
          {item('New project', () => confirm('Start a new empty project? Save the current one first if you need it.') && newProject(), undefined, 'file')}
          {item('Open project…', onOpen, 'Ctrl+O', 'open')}
          {item('Save project file', () => saveProject(getState().doc), 'Ctrl+S', 'save')}
          <div className="menu-sep" />
          {item('Import SVG / image…', onImport, 'Ctrl+I', 'upload')}
          {item('Export…', onExport, 'Ctrl+E', 'export')}
          <div className="menu-sep" />
          {item('Open demo project', () => loadDoc(demoDoc()), undefined, 'sparkles')}
          {item(theme === 'dark' ? 'Light theme' : 'Dark theme', () => setTheme(theme === 'dark' ? 'light' : 'dark'), undefined, theme === 'dark' ? 'sun' : 'moon')}
          {item('Shortcuts & help', onHelp, '?', 'help')}
          {item('Source code (MIT)', () => window.open('https://github.com/itsrajverma/animora', '_blank', 'noopener'), undefined, 'github')}
        </div>
      )}
    </div>
  );
}

export function TopBar(props: Props) {
  const name = useStore((s) => s.doc.name);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const selection = useStore((s) => s.selection);
  const zoom = useStore((s) => s.zoom);
  const saved = useStore((s) => s.doc);
  const [savedFlash, setSavedFlash] = useState(false);
  useEffect(() => {
    setSavedFlash(true);
    const t = setTimeout(() => setSavedFlash(false), 900);
    return () => clearTimeout(t);
  }, [saved]);
  const any = selection.length > 0;

  return (
    <header className="topbar">
      <div className="tb-left">
        <AppMenu {...props} />
        <input className="doc-name" value={name} onChange={(e) => patchDoc({ name: e.target.value }, 'docname')} aria-label="Project name" spellCheck={false} />
        <TB icon="undo" title="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo} />
        <TB icon="redo" title="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo} />
      </div>

      <div className="tb-tools">
        {PRIMARY_TOOL_GROUPS.map((group) => <ToolGroup key={group.id} tools={group.tools} />)}
        <span className="tb-sep" />
        <TB icon="fitScreen" title="Fit canvas into view (1)" onClick={() => canvasApi.fit()} />
        <MoreMenu any={any} selectionCount={selection.length} />
        <div className="zoom-ctl">
          <button onClick={() => canvasApi.zoomBy(1 / 1.25)} title="Zoom out">−</button>
          <button className="zoom-val" onClick={() => canvasApi.fit()} title="Fit (Ctrl+0)">{Math.round(zoom * 100)}%</button>
          <button onClick={() => canvasApi.zoomBy(1.25)} title="Zoom in">+</button>
        </div>
      </div>

      <div className="tb-right">
        <span className={`save-state ${savedFlash ? 'flash' : ''}`} title="Your work is saved automatically in this browser">
          <Icon name="cloud" size={20} />
        </span>
        <button className="tb-btn" onClick={() => setState({ rightTab: 'comments', rightOpen: true })} title="Comments">
          <Icon name="comment" size={18} />
        </button>
        <button className="export-btn" onClick={props.onExport}>Export</button>
      </div>
    </header>
  );
}
