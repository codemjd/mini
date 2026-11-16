import type { SparkObjectKind } from "./model";

export type SparkComponentPropertyType = "number" | "boolean" | "string" | "enum" | "color";
export interface SparkComponentProperty {
  key: string;
  label: string;
  type: SparkComponentPropertyType;
  defaultValue: number | boolean | string;
  min?: number;
  max?: number;
  step?: number;
  options?: readonly string[];
  required: boolean;
}
export interface SparkComponentDefinition {
  id: string;
  label: string;
  description: string;
  category: "movement" | "combat" | "physics" | "interaction" | "ai" | "audio" | "visual";
  compatibleKinds: readonly SparkObjectKind[];
  properties: readonly SparkComponentProperty[];
  unique: boolean;
}
export interface SparkComponentInstance {
  id: string;
  properties: Record<string, unknown>;
}
export interface SparkComponentValidation {
  ok: boolean;
  value?: SparkComponentInstance;
  errors: string[];
}

const ALL: readonly SparkObjectKind[] = ["hero", "enemy", "coin", "crate", "platform"];
const ACTORS: readonly SparkObjectKind[] = ["hero", "enemy"];
const SOLIDS: readonly SparkObjectKind[] = ["crate", "platform"];
const prop = (key: string, label: string, type: SparkComponentPropertyType, defaultValue: number | boolean | string, extra: Partial<SparkComponentProperty> = {}): SparkComponentProperty =>
  ({ key, label, type, defaultValue, required: true, ...extra });

/** Audited catalogue only: definitions are data, never executable user code. */
export const SPARK_COMPONENTS: readonly SparkComponentDefinition[] = [
  { id: "transform", label: "التحويل", description: "موضع الكائن وحجمه واتجاهه", category: "visual", compatibleKinds: ALL, unique: true, properties: [prop("x", "الموضع الأفقي", "number", 400, { min: 0, max: 800 }), prop("y", "الموضع العمودي", "number", 225, { min: 0, max: 450 }), prop("scale", "الحجم", "number", 1, { min: 0.25, max: 3, step: 0.05 }), prop("rotation", "الدوران", "number", 0, { min: -360, max: 360 })] },
  { id: "visual", label: "المظهر", description: "اللون والظهور والشفافية", category: "visual", compatibleKinds: ALL, unique: true, properties: [prop("color", "اللون", "color", "#ffbd59"), prop("visible", "ظاهر", "boolean", true), prop("opacity", "الشفافية", "number", 1, { min: 0, max: 1, step: 0.05 })] },
  { id: "animation", label: "الحركة البصرية", description: "حركة شكلية جاهزة للكائن", category: "visual", compatibleKinds: ALL, unique: true, properties: [prop("motion", "النمط", "enum", "idle", { options: ["idle", "float", "pulse", "bounce", "wobble"] }), prop("speed", "سرعة الحركة", "number", 1, { min: 0.1, max: 4, step: 0.1 })] },
  { id: "collider", label: "التصادم", description: "حدود اصطدام الكائنات", category: "physics", compatibleKinds: ALL, unique: true, properties: [prop("enabled", "مفعّل", "boolean", true), prop("shape", "الشكل", "enum", "circle", { options: ["circle", "rectangle"] }), prop("width", "العرض", "number", 48, { min: 1, max: 800 }), prop("height", "الارتفاع", "number", 48, { min: 1, max: 450 })] },
  { id: "movement", label: "الحركة", description: "سرعة الحركة والحد الأقصى", category: "movement", compatibleKinds: ACTORS, unique: true, properties: [prop("speed", "السرعة", "number", 180, { min: 0, max: 1000 }), prop("maxSpeed", "السرعة القصوى", "number", 300, { min: 1, max: 1200 })] },
  { id: "player-input", label: "تحكم اللاعب", description: "ربط الكائن بأزرار اللمس ولوحة المفاتيح", category: "movement", compatibleKinds: ["hero"], unique: true, properties: [prop("enabled", "مفعّل", "boolean", true), prop("scheme", "نمط التحكم", "enum", "touch-and-keyboard", { options: ["touch", "keyboard", "touch-and-keyboard"] })] },
  { id: "health", label: "الصحة", description: "نقاط الصحة والمقدار الأقصى", category: "combat", compatibleKinds: ACTORS, unique: true, properties: [prop("maximum", "الصحة القصوى", "number", 100, { min: 1, max: 10000 }), prop("current", "الصحة الحالية", "number", 100, { min: 0, max: 10000 })] },
  { id: "combat", label: "القتال", description: "قوة الضرر ومدى الهجوم وفترة الانتظار", category: "combat", compatibleKinds: ACTORS, unique: true, properties: [prop("damage", "الضرر", "number", 20, { min: 0, max: 1000 }), prop("range", "المدى", "number", 56, { min: 1, max: 500 }), prop("cooldownMs", "فترة الانتظار", "number", 700, { min: 0, max: 10000 })] },
  { id: "collectible", label: "عنصر قابل للجمع", description: "قيمة العنصر عند التقاطه", category: "interaction", compatibleKinds: ["coin"], unique: true, properties: [prop("value", "القيمة", "number", 1, { min: 1, max: 9999 })] },
  { id: "enemy-brain", label: "ذكاء العدو", description: "سلوك مطاردة أو حراسة بسيط قابل للتوسعة", category: "ai", compatibleKinds: ["enemy"], unique: true, properties: [prop("mode", "السلوك", "enum", "chase", { options: ["chase", "guard"] }), prop("speed", "سرعة الحركة", "number", 100, { min: 0, max: 1000 }), prop("detectionRange", "مدى الاكتشاف", "number", 260, { min: 0, max: 800 })] },
  { id: "trigger-zone", label: "منطقة تفعيل", description: "منطقة تطلق حدثًا عند دخول كائن", category: "interaction", compatibleKinds: ALL, unique: false, properties: [prop("width", "العرض", "number", 120, { min: 1, max: 800 }), prop("height", "الارتفاع", "number", 80, { min: 1, max: 450 }), prop("once", "مرة واحدة", "boolean", false)] },
  { id: "audio-emitter", label: "مصدر صوت", description: "إعداد صوت مرتبط بالكائن", category: "audio", compatibleKinds: ALL, unique: true, properties: [prop("soundId", "معرّف الصوت", "string", ""), prop("volume", "مستوى الصوت", "number", 0.8, { min: 0, max: 1, step: 0.05 }), prop("loop", "تكرار", "boolean", false)] }
] as const;

const BY_ID = new Map(SPARK_COMPONENTS.map(item => [item.id, item]));
export function getSparkComponent(id: string): SparkComponentDefinition | undefined { return BY_ID.get(id); }
export function listSparkComponents(kind?: SparkObjectKind): SparkComponentDefinition[] {
  return SPARK_COMPONENTS.filter(item => !kind || item.compatibleKinds.includes(kind));
}
export function createSparkComponentInstance(componentId: string, id: string): SparkComponentInstance | null {
  const definition = getSparkComponent(componentId);
  if (!definition || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) return null;
  return { id, properties: Object.fromEntries(definition.properties.map(item => [item.key, item.defaultValue])) };
}

/** Strictly normalize values against the registry; unknown properties never survive. */
export function validateSparkComponent(kind: SparkObjectKind, raw: unknown): SparkComponentValidation {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") return { ok: false, errors: ["بيانات المكوّن غير صالحة"] };
  const input = raw as { id?: unknown; properties?: unknown };
  const definition = typeof input.id === "string" ? getSparkComponent(input.id) : undefined;
  if (!definition) return { ok: false, errors: ["المكوّن غير معروف"] };
  if (!definition.compatibleKinds.includes(kind)) errors.push("هذا المكوّن غير متوافق مع نوع الكائن");
  if (!input.properties || typeof input.properties !== "object" || Array.isArray(input.properties)) {
    return { ok: false, errors: [...errors, "خصائص المكوّن غير صالحة"] };
  }
  const source = input.properties as Record<string, unknown>;
  const properties: Record<string, unknown> = {};
  for (const schema of definition.properties) {
    const value = source[schema.key] ?? schema.defaultValue;
    if (schema.type === "number") {
      const number = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(number) || number < (schema.min ?? -Infinity) || number > (schema.max ?? Infinity)) {
        errors.push("قيمة غير صالحة: " + schema.label);
      } else properties[schema.key] = number;
    } else if (schema.type === "boolean") {
      if (typeof value !== "boolean") errors.push("قيمة غير صالحة: " + schema.label);
      else properties[schema.key] = value;
    } else if (schema.type === "enum") {
      if (!schema.options?.includes(String(value))) errors.push("اختيار غير صالح: " + schema.label);
      else properties[schema.key] = value;
    } else if (schema.type === "color") {
      if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) errors.push("لون غير صالح: " + schema.label);
      else properties[schema.key] = value;
    } else {
      if (typeof value !== "string" || value.length > 120) errors.push("نص غير صالح: " + schema.label);
      else properties[schema.key] = value;
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true, value: { id: definition.id, properties }, errors: [] };
}
