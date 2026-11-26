import type { StudioProject } from "../types/project";
import { validateStudioProject } from "./project-validation";
import type { AudioAssetRecord } from "./audio-assets";

const BUNDLE_FORMAT = "explainer-studio-project";
const BUNDLE_VERSION = 1;
const MAX_AUDIO_ASSET_BYTES = 30 * 1024 * 1024;
const MAX_TOTAL_AUDIO_BYTES = 50 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["audio/wav", "audio/mpeg"]);

interface SerializedAudioAsset {
  id: string;
  projectId: string;
  sceneId: string;
  fileName: string;
  mimeType: string;
  durationSeconds: number;
  source: "uploaded" | "nabra";
  createdAt: string;
  base64: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  if (binary.length > MAX_AUDIO_ASSET_BYTES) {
    throw new Error("أحد ملفات الصوت أكبر من الحد المسموح به في ملف المشروع (30 ميغابايت).");
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
}

export async function serializeProjectBundle(
  project: StudioProject,
  assets: AudioAssetRecord[]
): Promise<string> {
  const referencedIds = [...new Set(project.scenes.map((scene) => scene.narrationAudioAssetId).filter((id): id is string => Boolean(id)))];
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  let totalBytes = 0;
  const audioAssets: SerializedAudioAsset[] = [];

  for (const id of referencedIds) {
    const asset = byId.get(id);
    if (!asset) throw new Error("تعذر تضمين أحد ملفات الصوت المرتبطة بالمشروع. أعد رفعه قبل التصدير.");
    if (asset.projectId !== project.id) throw new Error("ملف صوت مرتبط بمشروع آخر ولا يمكن تضمينه هنا.");
    const scene = project.scenes.find((item) => item.id === asset.sceneId);
    if (!scene || scene.narrationAudioAssetId !== asset.id) throw new Error("ارتباط ملف الصوت بالمشهد غير صالح.");
    if (!ALLOWED_MIME_TYPES.has(asset.mimeType)) throw new Error("صيغة ملف صوت غير مدعومة في حزمة المشروع.");
    if (asset.blob.size > MAX_AUDIO_ASSET_BYTES) throw new Error("يتجاوز أحد ملفات الصوت حد 30 ميغابايت.");
    totalBytes += asset.blob.size;
    if (totalBytes > MAX_TOTAL_AUDIO_BYTES) throw new Error("يتجاوز مجموع ملفات الصوت حد 50 ميغابايت.");
    audioAssets.push({
      id: asset.id,
      projectId: asset.projectId,
      sceneId: asset.sceneId,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      durationSeconds: asset.durationSeconds,
      source: asset.source,
      createdAt: asset.createdAt,
      base64: await blobToBase64(asset.blob)
    });
  }

  return JSON.stringify({
    format: BUNDLE_FORMAT,
    bundleVersion: BUNDLE_VERSION,
    project,
    audioAssets
  }, null, 2);
}

export function parseProjectBundle(input: unknown): { project: StudioProject; audioAssets: AudioAssetRecord[] } {
  if (!isRecord(input) || input.format !== BUNDLE_FORMAT) {
    const validation = validateStudioProject(input);
    if (!validation.valid) {
      throw new Error(validation.issues.slice(0, 3).map((item) => item.message).join(" ") || "ملف المشروع لا يطابق الصيغة المدعومة.");
    }
    if (validation.project.scenes.some((scene) => scene.narrationAudioAssetId)) {
      throw new Error("هذا الملف يشير إلى ملفات صوت غير مضمّنة. صدّر المشروع مجددًا من النسخة الحالية مع أصول الصوت.");
    }
    return { project: validation.project, audioAssets: [] };
  }

  if (input.bundleVersion !== BUNDLE_VERSION || !Array.isArray(input.audioAssets)) {
    throw new Error("إصدار حزمة المشروع غير مدعوم أو قائمة ملفات الصوت غير صالحة.");
  }

  const validation = validateStudioProject(input.project);
  if (!validation.valid) {
    throw new Error(validation.issues.slice(0, 3).map((item) => item.message).join(" ") || "بيانات المشروع داخل الحزمة غير صالحة.");
  }
  const project = validation.project;
  let totalBytes = 0;
  const ids = new Set<string>();
  const audioAssets: AudioAssetRecord[] = [];

  for (const raw of input.audioAssets) {
    if (!isRecord(raw)) throw new Error("بيانات أحد ملفات الصوت داخل الحزمة غير صالحة.");
    const { id, projectId, sceneId, fileName, mimeType, durationSeconds, source, createdAt, base64 } = raw;
    if (typeof id !== "string" || !id || ids.has(id)) throw new Error("معرّف ملف صوت مفقود أو مكرر داخل الحزمة.");
    if (projectId !== project.id || typeof sceneId !== "string") throw new Error("ارتباط ملف صوت بالمشروع أو المشهد غير صالح.");
    if (typeof fileName !== "string" || fileName.length > 180) throw new Error("اسم ملف الصوت غير صالح.");
    if (typeof mimeType !== "string" || !ALLOWED_MIME_TYPES.has(mimeType)) throw new Error("تحتوي الحزمة على صيغة صوت غير مدعومة.");
    if (typeof durationSeconds !== "number" || !Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 600) {
      throw new Error("مدة ملف صوت داخل الحزمة غير صالحة.");
    }
    if (source !== "uploaded" && source !== "nabra") throw new Error("مصدر ملف الصوت داخل الحزمة غير معروف.");
    if (typeof createdAt !== "string" || Number.isNaN(Date.parse(createdAt))) throw new Error("تاريخ ملف الصوت غير صالح.");
    if (typeof base64 !== "string" || base64.length > Math.ceil(MAX_AUDIO_ASSET_BYTES * 4 / 3) + 8) {
      throw new Error("بيانات ملف الصوت مفقودة أو تتجاوز الحد.");
    }
    const blob = base64ToBlob(base64, mimeType);
    totalBytes += blob.size;
    if (totalBytes > MAX_TOTAL_AUDIO_BYTES) throw new Error("يتجاوز مجموع ملفات الصوت حد 50 ميغابايت.");
    const scene = project.scenes.find((item) => item.id === sceneId);
    if (!scene || scene.narrationAudioAssetId !== id) throw new Error("ملف صوت غير مرتبط بمشهد مطابق داخل المشروع.");
    ids.add(id);
    audioAssets.push({
      id,
      projectId: project.id,
      sceneId,
      fileName,
      mimeType: mimeType as AudioAssetRecord["mimeType"],
      durationSeconds,
      source,
      createdAt,
      blob
    });
  }

  for (const scene of project.scenes) {
    if (scene.narrationAudioAssetId && !ids.has(scene.narrationAudioAssetId)) {
      throw new Error("تفتقد الحزمة ملف الصوت المرتبط بالمشهد «" + scene.title + "».");
    }
  }

  return { project, audioAssets };
}
