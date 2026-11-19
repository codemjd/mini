# Animora — Product Direction: Explainer-first

**Status:** Product direction adopted; implementation is incremental.  
**Target:** Mobile-first browser editor for short and medium explainer videos.

## Product promise

Animora helps a creator turn an explanation into a sequence of clear visual scenes. The core workflow is:

1. Create a project and choose a video format.
2. Add scenes or start from an explainer template.
3. Add text, shapes, icons, diagrams, charts, images, and video.
4. Apply camera-style movement and object animation using simple presets.
5. Arrange scenes, narration, and optional sound.
6. Preview the complete explanation and export one video.

The editor is **not** intended to be a general-purpose nonlinear video editor. Internal media tracks may remain where needed by the rendering engine, but the default user experience should expose only the controls that help make an explainer.

## Primary editing model

- **Scene-first:** scenes are the main unit of structure. The scene strip should be easy to understand and reorder.
- **Canvas-first:** the preview/canvas is the visual center; select an object to edit it directly.
- **Simple timeline:** show scene duration, playhead, and a small number of meaningful lanes. Advanced keyframe and media-lane controls should be progressively disclosed, not presented as the first thing a beginner sees.
- **Preset-driven motion:** common actions should be one-tap presets with sensible defaults and editable duration/intensity.
- **Camera motion:** make zoom, pan, focus, and framing first-class explainer actions, distinct from changing an object's own scale.
- **Narrative pacing:** transitions and scene timing should help the viewer follow the explanation rather than imitate a full professional NLE.

## Core controls

### Camera and focus
- Zoom in / zoom out
- Pan left / right / up / down
- Focus on selected object
- Return to full-scene framing
- Set start and end framing for a scene
- Smooth easing and duration presets

### Object motion
- Fade in / fade out
- Slide in / slide out
- Pop / scale in
- Move along a simple path
- Emphasize / pulse / highlight
- Stagger multiple objects

### Explainer content
- Titles, subtitles, labels, callouts, arrows, circles, markers
- Simple diagrams, steps, timelines, comparison layouts
- Charts and numeric counters
- Maps and icon-led visual explanations
- Captions and narration alignment

## Default workspace

1. Top bar: project name, undo/redo, preview, export.
2. Main canvas: large preview with direct selection and camera framing.
3. Scene strip: thumbnails, add, duplicate, reorder, transition.
4. Contextual side panel: only the selected scene/object's most relevant controls.
5. Compact timeline: scene duration and a few visible content/audio lanes; advanced lanes and keyframes are optional panels.

On narrow screens, use a single focused editing surface with bottom actions and contextual sheets. Avoid three permanently open desktop-style columns.

## Explicitly out of scope for the first release

- A general-purpose multitrack editor comparable to Premiere, DaVinci Resolve, or Kdenlive.
- Complex audio mixing consoles, advanced color grading, multicamera editing, and elaborate codec controls.
- Requiring users to understand keyframes, easing curves, source offsets, or track routing for common tasks.
- An expansive asset marketplace before the core scene, motion, and export workflow is dependable.

These capabilities may remain as internal foundations or optional advanced tools, but must not dominate the default experience.

## Product acceptance criteria

- A beginner can create a short multi-scene explainer without needing to configure advanced tracks.
- Zoom/pan/focus can be applied to a scene with a small number of direct actions.
- Text, shapes, diagrams, and callouts can be animated with presets.
- Scene order, duration, and transitions are understandable from the scene strip.
- Preview and export use the same scene timing and camera framing.
- The interface works at mobile widths without persistent desktop sidebars.
- Export is not labelled complete until imported media and audio are actually included and synchronization is verified.

## Engineering implications

- Preserve the existing SVG/keyframe renderer and project compatibility while adding a camera transform layer.
- Keep camera framing data separate from individual object transforms.
- Keep audio scheduling and media decoding modular; integrate them into the final video recorder only with real synchronization tests.
- Build explainer-specific templates and content primitives before adding general-purpose editing features.
- Treat the current multi-lane timeline as infrastructure. Simplify its default presentation rather than deleting project data or breaking older projects.
