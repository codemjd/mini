export type SceneLayout = "title" | "split" | "diagram" | "timeline" | "stats" | "quote" | "comparison" | "flow";

export type VisualBlockKind = "heading" | "body" | "metric" | "shape" | "step";

export interface VisualBlock {
  id: string;
  kind: VisualBlockKind;
  content: string;
  accent?: string;
}

export interface Scene {
  id: string;
  title: string;
  narration: string;
  durationSeconds: number;
  layout: SceneLayout;
  background: string;
  blocks: VisualBlock[];
  /** Reference to a locally stored narration clip; the audio bytes live in IndexedDB. */
  narrationAudioAssetId?: string;
  /** Exact narration text used to create or attach this audio; mismatch means stale audio. */
  narrationAudioText?: string;
}

export interface VideoSettings {
  width: number;
  height: number;
  fps: number;
  language: "ar" | "en";
}

export interface ContentPolicy {
  livingCharacters: false;
  music: false;
}

export interface StudioProject {
  schemaVersion: 1;
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  settings: VideoSettings;
  contentPolicy?: ContentPolicy;
  scenes: Scene[];
}

export interface ProjectSummary {
  id: string;
  title: string;
  updatedAt: string;
  sceneCount: number;
  durationSeconds: number;
}

export function createId(): string {
  return globalThis.crypto?.randomUUID?.() ??
    `project-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createStarterProject(title = "مشروع جديد"): StudioProject {
  const now = new Date().toISOString();

  return {
    schemaVersion: 1,
    id: createId(),
    title,
    description: "فيديو تفسيري جديد — أضف فكرتك وابدأ بتقسيمها إلى مشاهد.",
    createdAt: now,
    updatedAt: now,
    settings: {
      width: 1920,
      height: 1080,
      fps: 30,
      language: "ar"
    },
    contentPolicy: { livingCharacters: false, music: false },
    scenes: [
      {
        id: createId(),
        title: "المقدمة",
        narration: "ابدأ بتقديم السؤال أو الفكرة التي سيشرحها الفيديو.",
        durationSeconds: 8,
        layout: "title",
        background: "#151b2a",
        blocks: [
          { id: createId(), kind: "heading", content: "الفكرة تبدأ بسؤال" },
          { id: createId(), kind: "body", content: "عنوان تمهيدي قصير وواضح" }
        ]
      },
      {
        id: createId(),
        title: "الفكرة الأساسية",
        narration: "اشرح هنا أول نقطة رئيسية، ثم اربطها بما يليها.",
        durationSeconds: 12,
        layout: "diagram",
        background: "#182236",
        blocks: [
          { id: createId(), kind: "heading", content: "كيف تعمل الفكرة؟" },
          { id: createId(), kind: "body", content: "قسّم الشرح إلى مراحل مترابطة" },
          { id: createId(), kind: "metric", content: "01" }
        ]
      },
      {
        id: createId(),
        title: "الخلاصة",
        narration: "اختم بالنتيجة الأهم التي ينبغي أن يتذكرها المشاهد.",
        durationSeconds: 8,
        layout: "split",
        background: "#201d35",
        blocks: [
          { id: createId(), kind: "heading", content: "ما النتيجة؟" },
          { id: createId(), kind: "body", content: "لخّص الرسالة في جملة واحدة" }
        ]
      }
    ]
  };
}

export function summarizeProject(project: StudioProject): ProjectSummary {
  return {
    id: project.id,
    title: project.title,
    updatedAt: project.updatedAt,
    sceneCount: project.scenes.length,
    durationSeconds: project.scenes.reduce((total, scene) => total + scene.durationSeconds, 0)
  };
}
