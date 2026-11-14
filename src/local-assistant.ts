export type LocalObjectKind = "hero" | "enemy" | "crate" | "platform";

export type LocalAssistantAction =
  | { type: "prepare-game" }
  | { type: "add-object"; kind: LocalObjectKind }
  | { type: "add-coins"; count: number }
  | { type: "tune"; target: "hero" | "enemy" | "selected"; values: { speed?: number; health?: number; damage?: number } }
  | { type: "color"; target: "hero" | "enemy" | "selected"; color: string; colorName: string }
  | { type: "ease-game" }
  | { type: "delete-selected" }
  | { type: "duplicate-selected" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "start-preview" }
  | { type: "stop-preview" }
  | { type: "help" };

export type LocalAssistantResult = {
  action: LocalAssistantAction;
  reply: string;
};

const arabicDigits: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9"
};

const numberWords: Record<string, number> = {
  واحد: 1, واحده: 1, اثنين: 2, اثنان: 2, اتنين: 2,
  ثلاثه: 3, ثلاث: 3, اربعه: 4, اربع: 4,
  خمسه: 5, خمس: 5, سته: 6, سبعه: 7,
  ثمانيه: 8, ثمان: 8, تسعه: 9, عشره: 10
};

const colors: Array<{ words: string[]; name: string; hex: string }> = [
  { words: ["ازرق"], name: "الأزرق", hex: "#56b9e9" },
  { words: ["احمر"], name: "الأحمر", hex: "#f16d72" },
  { words: ["اخضر"], name: "الأخضر", hex: "#57c99a" },
  { words: ["بنفسجي", "ارجواني"], name: "البنفسجي", hex: "#a78bfa" },
  { words: ["اصفر"], name: "الأصفر", hex: "#f5ca55" },
  { words: ["برتقالي"], name: "البرتقالي", hex: "#f39b55" },
  { words: ["وردي", "زهري"], name: "الوردي", hex: "#ef86b6" },
  { words: ["ابيض"], name: "الأبيض", hex: "#f0eee4" }
];

export function normalizeArabicCommand(value: string): string {
  return value
    .toLowerCase()
    .replace(/[٠-٩]/g, digit => arabicDigits[digit] ?? digit)
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[.,،؛!?؟:()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(value: string, words: string[]): boolean {
  return words.some(word => value.includes(word));
}

function readCount(value: string, fallback: number): number {
  const digit = value.match(/\b(\d{1,2})\b/);
  if (digit) return Math.max(1, Math.min(20, Number(digit[1])));
  const word = Object.entries(numberWords).find(([key]) => value.includes(key));
  return word ? word[1] : fallback;
}

export function resolveLocalCommand(raw: string): LocalAssistantResult | null {
  const value = normalizeArabicCommand(raw);
  if (!value) return null;

  if (includesAny(value, ["مساعده", "ماذا تستطيع", "الاوامر", "ساعدني", "كيف استخدمك", "ماذا تفهم"])) {
    return {
      action: { type: "help" },
      reply: "أعمل بقواعد محلية واضحة، وأستطيع تجهيز لعبة جمع البلورات، وإضافة العناصر والعملات، وضبط قوة البطل والعدو وألوانهما، والتراجع والمعاينة. جرّب أحد الأمثلة أسفل صندوق الكتابة."
    };
  }

  if (
    includesAny(value, ["جهز", "اعد", "انشئ", "اصنع", "ابدا"]) &&
    includesAny(value, ["لعبه", "جمع", "بلور", "جاهزه", "مصغره", "بدايه"])
  ) {
    return {
      action: { type: "prepare-game" },
      reply: "سأجهّز ساحة «رحلة البلورات» من جديد: بطل، حارس، وأربع بلورات قابلة للجمع."
    };
  }

  if (includesAny(value, ["ابدا المعاينه", "شغل المعاينه", "جرب اللعبه", "شغل اللعبه"])) {
    return { action: { type: "start-preview" }, reply: "بدأت المعاينة. تحرّك واجمع البلورات، واستخدم زر الهجوم قرب الحارس." };
  }
  if (includesAny(value, ["اوقف المعاينه", "انه المعاينه", "اخرج من المعاينه"])) {
    return { action: { type: "stop-preview" }, reply: "أوقفت المعاينة وأعدت المشهد إلى حالة التحرير." };
  }
  if (includesAny(value, ["تراجع", "الغ التعديل", "ارجع خطوه"])) {
    return { action: { type: "undo" }, reply: "طلبت التراجع عن آخر تعديل." };
  }
  if (includesAny(value, ["اعاده", "اعد التعديل", "استرجع التعديل"])) {
    return { action: { type: "redo" }, reply: "طلبت إعادة آخر تعديل تم التراجع عنه." };
  }
  if (includesAny(value, ["احذف المحدد", "احذف العنصر المحدد", "امسح المحدد"])) {
    return { action: { type: "delete-selected" }, reply: "سأحذف العنصر المحدد." };
  }
  if (includesAny(value, ["انسخ المحدد", "كرر المحدد", "ضاعف المحدد"])) {
    return { action: { type: "duplicate-selected" }, reply: "أنشأت نسخة من العنصر المحدد." };
  }

  const addVerb = includesAny(value, ["اضف", "ضع", "انشئ", "حط", "ضيف"]);
  if (addVerb && includesAny(value, ["عمله", "عملات", "بلوره", "بلورات", "كنز", "كنوز"])) {
    const count = readCount(value, 1);
    return {
      action: { type: "add-coins", count },
      reply: "سأضيف " + count + (count === 1 ? " عنصرًا لامعًا" : " عناصر لامعة") + " إلى الساحة."
    };
  }
  if (addVerb && includesAny(value, ["عدو", "وحش", "خصم", "حارس"])) {
    return { action: { type: "add-object", kind: "enemy" }, reply: "أضفت حارسًا جديدًا إلى الساحة." };
  }
  if (addVerb && includesAny(value, ["بطل", "لاعب", "شخصيه"])) {
    return { action: { type: "add-object", kind: "hero" }, reply: "أضفت شخصية لاعب جديدة." };
  }
  if (addVerb && includesAny(value, ["صندوق", "صناديق"])) {
    return { action: { type: "add-object", kind: "crate" }, reply: "أضفت صندوقًا إلى المشهد." };
  }
  if (addVerb && includesAny(value, ["منصه", "حاجز", "جدار"])) {
    return { action: { type: "add-object", kind: "platform" }, reply: "أضفت حاجزًا إلى المشهد." };
  }

  const target = includesAny(value, ["العدو", "الحارس", "الوحش"]) ? "enemy"
    : includesAny(value, ["المحدد", "العنصر"]) ? "selected" : "hero";

  const requestedColor = colors.find(color => color.words.some(word => value.includes(word)));
  if (requestedColor && includesAny(value, ["لون", "اجعل", "غير", "بدل", "غيرلي"])) {
    return {
      action: { type: "color", target, color: requestedColor.hex, colorName: requestedColor.name },
      reply: "سأحوّل لون " + (target === "enemy" ? "العدو" : target === "selected" ? "العنصر المحدد" : "البطل") + " إلى " + requestedColor.name + "."
    };
  }

  const explicitNumber = value.match(/\b(\d{1,3})\b/);
  if (target === "hero" && includesAny(value, ["اسرع", "سرعه"])) {
    const speed = explicitNumber ? Math.max(60, Math.min(500, Number(explicitNumber[1]))) : 260;
    return { action: { type: "tune", target, values: { speed } }, reply: "ضبطت سرعة البطل على " + speed + "." };
  }
  if (target === "hero" && includesAny(value, ["اقوي", "قوه", "ضرر"])) {
    const damage = explicitNumber ? Math.max(1, Math.min(200, Number(explicitNumber[1]))) : 42;
    return { action: { type: "tune", target, values: { damage } }, reply: "ضبطت ضرر البطل على " + damage + "." };
  }
  if (target === "enemy" && includesAny(value, ["اضعف", "اسهل", "ضعيف"])) {
    return { action: { type: "tune", target, values: { health: 55, speed: 90, damage: 8 } }, reply: "خفّضت صحة الحارس وسرعته وضرره لتصبح المواجهة أسهل." };
  }
  if (target === "enemy" && includesAny(value, ["اقوي", "اصعب", "قوي"])) {
    return { action: { type: "tune", target, values: { health: 160, speed: 145, damage: 20 } }, reply: "رفعت صحة الحارس وسرعته وضرره لتصبح المواجهة أصعب." };
  }
  if (includesAny(value, ["اللعبه اسهل", "اجعل اللعبه سهله", "خفف الصعوبه", "قلل الصعوبه"])) {
    return { action: { type: "ease-game" }, reply: "خفّفت صعوبة المواجهة، وزدت قدرة البطل على النجاة." };
  }

  return null;
}
