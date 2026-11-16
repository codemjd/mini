import type { SparkEditorObject, SparkEditorObjectKind } from "../editor/project-document";

export const DEFAULT_SPARK_SCRIPT = [
  '# إعداد بسيط للمشهد — الأوامر المدعومة فقط',
  'set("hero", "speed", 260);',
  'set("enemy", "health", 75);',
  'spawn("coin", 420, 225);',
  'note("تم تجهيز تحدٍ أسرع مع بلورة إضافية");'
].join("\n");

type ScriptValue = string | number;
type ScriptCommand =
  | { type: "set"; target: string; property: string; value: ScriptValue }
  | { type: "spawn"; kind: SparkEditorObjectKind; x: number; y: number }
  | { type: "remove"; target: string }
  | { type: "note"; message: string };

export interface SparkScriptExecution {
  ok: boolean;
  objects: SparkEditorObject[];
  messages: string[];
  error?: string;
  changed: boolean;
}

const kinds: SparkEditorObjectKind[] = ["hero", "enemy", "crate", "coin", "platform"];
const numericLimits: Record<string, [number, number]> = {
  x: [0, 800], y: [0, 450], health: [1, 1000], speed: [1, 1000],
  damage: [1, 500], size: [0.5, 2.5]
};

function parseArguments(source: string): ScriptValue[] {
  const args: ScriptValue[] = [];
  let index = 0;
  while (index < source.length) {
    while (/\s/.test(source[index] ?? "")) index += 1;
    if (index >= source.length) break;

    const quote = source[index];
    if (quote === '"' || quote === "'") {
      index += 1;
      let value = "";
      let closed = false;
      while (index < source.length) {
        const char = source[index++];
        if (char === quote) { closed = true; break; }
        if (char === "\\") {
          const escaped = source[index++];
          if (escaped === "n") value += "\n";
          else if (escaped === "t") value += "\t";
          else if (escaped === quote || escaped === "\\") value += escaped;
          else throw new Error("تسلسل هروب غير مدعوم داخل النص");
        } else value += char;
      }
      if (!closed) throw new Error("نص غير مغلق بعلامة اقتباس");
      args.push(value);
    } else {
      const start = index;
      while (index < source.length && source[index] !== ",") index += 1;
      const token = source.slice(start, index).trim();
      if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(token)) {
        throw new Error("القيم المسموحة أرقام أو نصوص بين علامتي اقتباس");
      }
      const value = Number(token);
      if (!Number.isFinite(value)) throw new Error("رقم غير صالح");
      args.push(value);
    }

    while (/\s/.test(source[index] ?? "")) index += 1;
    if (index < source.length) {
      if (source[index] !== ",") throw new Error("افصل بين الوسائط بفاصلة");
      index += 1;
    }
  }
  return args;
}

function requireString(value: ScriptValue | undefined, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(label + " يجب أن يكون نصًا بين علامتي اقتباس");
  return value.trim();
}
function requireNumber(value: ScriptValue | undefined, label: string): number {
  if (typeof value !== "number") throw new Error(label + " يجب أن يكون رقمًا");
  return value;
}

function parseCommand(line: string): ScriptCommand {
  const match = line.match(/^([a-zA-Z]+)\s*\((.*)\)\s*;?$/);
  if (!match) throw new Error('استخدم صيغة استدعاء مثل set("hero", "speed", 240);');
  const name = match[1];
  const args = parseArguments(match[2]);

  if (name === "set") {
    if (args.length !== 3) throw new Error('الصيغة: set("target", "property", value)');
    return { type: "set", target: requireString(args[0], "target"), property: requireString(args[1], "property"), value: args[2] };
  }
  if (name === "spawn") {
    if (args.length !== 3) throw new Error('الصيغة: spawn("kind", x, y)');
    const kind = requireString(args[0], "kind") as SparkEditorObjectKind;
    if (!kinds.includes(kind)) throw new Error("نوع الكائن غير مدعوم");
    return { type: "spawn", kind, x: requireNumber(args[1], "x"), y: requireNumber(args[2], "y") };
  }
  if (name === "remove") {
    if (args.length !== 1) throw new Error('الصيغة: remove("target")');
    return { type: "remove", target: requireString(args[0], "target") };
  }
  if (name === "note") {
    if (args.length !== 1) throw new Error('الصيغة: note("message")');
    return { type: "note", message: requireString(args[0], "message") };
  }
  throw new Error("الدالة غير متاحة. المتاح: set وspawn وremove وnote");
}

function boundedNumber(property: string, value: number): number {
  const limits = numericLimits[property];
  if (!limits) throw new Error("الخاصية الرقمية غير مسموحة");
  if (value < limits[0] || value > limits[1]) {
    throw new Error("قيمة " + property + " يجب أن تكون بين " + limits[0] + " و" + limits[1]);
  }
  return value;
}

/**
 * Spark Script is a deliberately small, deterministic command language.
 * It never evaluates JavaScript and exposes no browser, network, or filesystem APIs.
 */
export function executeSparkScript(
  source: string,
  currentObjects: SparkEditorObject[],
  createId: () => string
): SparkScriptExecution {
  const original = currentObjects.map((item) => ({ ...item }));
  if (source.length > 12_000) {
    return { ok: false, objects: original, messages: [], error: "المقتطف يتجاوز 12 ألف حرف", changed: false };
  }

  const lines = source.split(/\r?\n/);
  if (lines.length > 60) {
    return { ok: false, objects: original, messages: [], error: "الحد الأقصى 60 سطرًا في المقتطف الواحد", changed: false };
  }

  try {
    const commands: Array<{ command: ScriptCommand; line: number }> = [];
    lines.forEach((raw, index) => {
      const line = raw.trim();
      if (!line || line.startsWith("#")) return;
      commands.push({ command: parseCommand(line), line: index + 1 });
    });
    if (commands.length > 50) throw new Error("الحد الأقصى 50 أمرًا في المقتطف الواحد");

    const objects = original.map((item) => ({ ...item }));
    const messages: string[] = [];
    let changed = false;

    for (const entry of commands) {
      const command = entry.command;
      try {
        if (command.type === "note") {
          messages.push(command.message.slice(0, 180));
          continue;
        }
        if (command.type === "spawn") {
          const defaults: Record<SparkEditorObjectKind, { name: string; color: string }> = {
            hero: { name: "بطلي", color: "#ffbd59" },
            enemy: { name: "عدو", color: "#ff6b72" },
            crate: { name: "صندوق", color: "#c47a45" },
            platform: { name: "منصة", color: "#5d91a8" },
            coin: { name: "بلورة", color: "#ffd34e" }
          };
          objects.push({
            id: createId(), kind: command.kind,
            x: boundedNumber("x", command.x), y: boundedNumber("y", command.y),
            name: defaults[command.kind].name, health: 100, speed: 180, damage: 20,
            size: 1, color: defaults[command.kind].color
          });
          messages.push("أضيف: " + defaults[command.kind].name);
          changed = true;
          continue;
        }

        const targetIndex = objects.findIndex((item) => item.id === command.target || item.kind === command.target);
        if (targetIndex < 0) throw new Error('لم يتم العثور على الكائن "' + command.target + '"');
        if (command.type === "remove") {
          const removed = objects.splice(targetIndex, 1)[0];
          messages.push("حُذف: " + removed.name);
          changed = true;
          continue;
        }

        const allowed = ["x", "y", "health", "speed", "damage", "size", "color", "name"];
        if (!allowed.includes(command.property)) throw new Error("الخاصية غير مسموحة");
        const target = objects[targetIndex];
        if (command.property in numericLimits) {
          if (typeof command.value !== "number") throw new Error("هذه الخاصية تحتاج قيمة رقمية");
          (target as unknown as Record<string, unknown>)[command.property] = boundedNumber(command.property, command.value);
        } else if (command.property === "color") {
          if (typeof command.value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(command.value)) {
            throw new Error("اللون يجب أن يكون بصيغة #RRGGBB");
          }
          target.color = command.value;
        } else {
          if (typeof command.value !== "string" || !command.value.trim() || command.value.length > 24) {
            throw new Error("الاسم يجب أن يكون نصًا من 1 إلى 24 حرفًا");
          }
          target.name = command.value.trim();
        }
        messages.push("تم تعديل " + command.property + " للكائن " + target.name);
        changed = true;
      } catch (error) {
        throw new Error("السطر " + entry.line + ": " + (error instanceof Error ? error.message : "خطأ غير معروف"));
      }
    }

    return { ok: true, objects, messages, changed };
  } catch (error) {
    return {
      ok: false,
      objects: original,
      messages: [],
      error: error instanceof Error ? error.message : "تعذر تحليل المقتطف",
      changed: false
    };
  }
}
