import type { Scene, StudioProject, VisualBlock } from "../types/project";

export interface ProjectValidationIssue {
  path: string;
  message: string;
}

export type ProjectValidationResult =
  | { valid: true; project: StudioProject; issues: [] }
  | { valid: false; issues: ProjectValidationIssue[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isText = (value: unknown, maxLength = 4000): value is string =>
  typeof value === "string" && value.length <= maxLength;

const isHexColor = (value: unknown): value is string =>
  typeof value === "string" && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);

export function validateStudioProject(input: unknown): ProjectValidationResult {
  const issues: ProjectValidationIssue[] = [];
  const issue = (path: string, message: string) => issues.push({ path, message });

  if (!isRecord(input)) {
    return { valid: false, issues: [{ path: "$", message: "بيانات المشروع يجب أن تكون كائن JSON." }] };
  }

  if (input.schemaVersion !== 1) issue("schemaVersion", "إصدار صيغة المشروع غير مدعوم.");
  if (!isText(input.id, 160) || !input.id.trim()) issue("id", "معرّف المشروع غير صالح.");
  if (!isText(input.title, 160) || !input.title.trim()) issue("title", "عنوان المشروع مطلوب وبحد أقصى 160 حرفًا.");
  if (!isText(input.description, 2000)) issue("description", "وصف المشروع طويل أو غير صالح.");
  if (!isText(input.createdAt, 80) || Number.isNaN(Date.parse(input.createdAt))) issue("createdAt", "تاريخ الإنشاء غير صالح.");
  if (!isText(input.updatedAt, 80) || Number.isNaN(Date.parse(input.updatedAt))) issue("updatedAt", "تاريخ التعديل غير صالح.");

  if (!isRecord(input.settings)) {
    issue("settings", "إعدادات الفيديو مفقودة.");
  } else {
    const { width, height, fps, language } = input.settings;
    if (!Number.isInteger(width) || Number(width) < 320 || Number(width) > 3840) issue("settings.width", "العرض يجب أن يكون بين 320 و3840.");
    if (!Number.isInteger(height) || Number(height) < 180 || Number(height) > 2160) issue("settings.height", "الارتفاع يجب أن يكون بين 180 و2160.");
    if (![24, 25, 30, 50, 60].includes(Number(fps))) issue("settings.fps", "معدل الإطارات غير مدعوم.");
    if (language !== "ar" && language !== "en") issue("settings.language", "لغة المشروع غير مدعومة.");
  }

  if (input.contentPolicy !== undefined) {
    if (!isRecord(input.contentPolicy)) {
      issue("contentPolicy", "سياسة المحتوى غير صالحة.");
    } else {
      if (input.contentPolicy.livingCharacters !== false) {
        issue("contentPolicy.livingCharacters", "هذا المشروع يمنع ظهور البشر والحيوانات والشخصيات الحية.");
      }
      if (input.contentPolicy.music !== false) {
        issue("contentPolicy.music", "هذا المشروع يمنع إضافة الموسيقى.");
      }
    }
  }

  if (!Array.isArray(input.scenes) || input.scenes.length < 1 || input.scenes.length > 200) {
    issue("scenes", "يجب أن يحتوي المشروع على 1 إلى 200 مشهد.");
  } else {
    const sceneIds = new Set<string>();
    input.scenes.forEach((rawScene, index) => {
      const path = `scenes[${index}]`;
      if (!isRecord(rawScene)) {
        issue(path, "بيانات المشهد غير صالحة.");
        return;
      }
      const scene = rawScene;
      if (!isText(scene.id, 160) || !scene.id.trim()) issue(`${path}.id`, "معرّف المشهد مطلوب.");
      else if (sceneIds.has(scene.id)) issue(`${path}.id`, "معرّف المشهد مكرر.");
      else sceneIds.add(scene.id);
      if (!isText(scene.title, 160) || !scene.title.trim()) issue(`${path}.title`, "عنوان المشهد مطلوب.");
      if (!isText(scene.narration, 12000)) issue(`${path}.narration`, "نص التعليق طويل أو غير صالح.");
      if (scene.narrationAudioAssetId !== undefined && (!isText(scene.narrationAudioAssetId, 160) || !scene.narrationAudioAssetId.trim())) {
        issue(`${path}.narrationAudioAssetId`, "معرّف ملف التعليق الصوتي غير صالح.");
      }
      if (scene.narrationAudioText !== undefined && !isText(scene.narrationAudioText, 12000)) {
        issue(`${path}.narrationAudioText`, "نسخة نص التعليق المرتبطة بالصوت غير صالحة.");
      }
      if (scene.narrationAudioText !== undefined && !scene.narrationAudioAssetId) {
        issue(`${path}.narrationAudioText`, "لا يمكن حفظ نسخة نص مرتبطة بالصوت دون ملف صوت.");
      }
      if (!Number.isFinite(scene.durationSeconds) || Number(scene.durationSeconds) < 1 || Number(scene.durationSeconds) > 600) issue(`${path}.durationSeconds`, "مدة المشهد يجب أن تكون بين 1 و600 ثانية.");
      if (!["title", "split", "diagram", "timeline", "stats", "quote", "comparison", "flow"].includes(String(scene.layout))) issue(`${path}.layout`, "تخطيط المشهد غير معروف.");
      if (!isHexColor(scene.background)) issue(`${path}.background`, "لون الخلفية يجب أن يكون HEX صالحًا.");
      if (!Array.isArray(scene.blocks) || scene.blocks.length > 30) {
        issue(`${path}.blocks`, "قائمة العناصر البصرية غير صالحة أو تتجاوز 30 عنصرًا.");
      } else {
        const blockIds = new Set<string>();
        scene.blocks.forEach((rawBlock, blockIndex) => {
          const blockPath = `${path}.blocks[${blockIndex}]`;
          if (!isRecord(rawBlock)) {
            issue(blockPath, "العنصر البصري غير صالح.");
            return;
          }
          if (!isText(rawBlock.id, 160) || !rawBlock.id.trim()) issue(`${blockPath}.id`, "معرّف العنصر مطلوب.");
          else if (blockIds.has(rawBlock.id)) issue(`${blockPath}.id`, "معرّف العنصر مكرر داخل المشهد.");
          else blockIds.add(rawBlock.id);
          if (!["heading", "body", "metric", "shape", "step"].includes(String(rawBlock.kind))) issue(`${blockPath}.kind`, "نوع العنصر غير مدعوم.");
          if (!isText(rawBlock.content)) issue(`${blockPath}.content`, "نص العنصر طويل أو غير صالح.");
          if (rawBlock.accent !== undefined && !isHexColor(rawBlock.accent)) issue(`${blockPath}.accent`, "لون التمييز غير صالح.");
        });
      }
    });
  }

  if (issues.length > 0) return { valid: false, issues };
  const normalizedProject = {
    ...input,
    contentPolicy: input.contentPolicy ?? { livingCharacters: false, music: false }
  } as unknown as StudioProject;
  return { valid: true, project: normalizedProject, issues: [] };
}
