import type { StudioProject } from "../types/project";

export const demoProject: StudioProject = {
  schemaVersion: 1,
  id: "explainer-studio-render-smoke",
  title: "كيف تنتقل البيانات عبر الإنترنت؟",
  description: "عرض تجريبي أطول يختبر خمسة أنماط بصرية وحركة المشاهد وسياسة المحتوى الآمنة.",
  createdAt: "2026-11-25T00:00:00.000Z",
  updatedAt: "2026-11-25T00:00:00.000Z",
  settings: { width: 1920, height: 1080, fps: 30, language: "ar" },
  contentPolicy: { livingCharacters: false, music: false },
  scenes: [
    {
      id: "demo-scene-01",
      title: "الفكرة ببساطة",
      narration: "عندما ترسل صورة أو رسالة، لا تنتقل البيانات عادة كقطعة واحدة؛ بل تُجهّز للإرسال عبر الشبكة.",
      durationSeconds: 4,
      layout: "title",
      background: "#151b2a",
      blocks: [
        { id: "demo-01-heading", kind: "heading", content: "كيف تنتقل البيانات عبر الإنترنت؟" },
        { id: "demo-01-body", kind: "body", content: "رحلة رقمية تبدأ من جهازك وتصل إلى وجهتها" },
        { id: "demo-01-metric", kind: "metric", content: "01" }
      ]
    },
    {
      id: "demo-scene-02",
      title: "الحزم الرقمية",
      narration: "تُقسّم البيانات إلى وحدات أصغر تسمى حزمًا. تحمل كل حزمة جزءًا من المحتوى ومعلومات تساعد الشبكة على توجيهها.",
      durationSeconds: 5,
      layout: "diagram",
      background: "#182236",
      blocks: [
        { id: "demo-02-heading", kind: "heading", content: "البيانات تسافر كحزم" },
        { id: "demo-02-body", kind: "body", content: "كل حزمة تحمل جزءًا من المعلومات وبيانات التوجيه" },
        { id: "demo-02-metric", kind: "metric", content: "02" }
      ]
    },
    {
      id: "demo-scene-03",
      title: "إعادة التجميع",
      narration: "قد تسلك الحزم مسارات مختلفة، لكن الجهاز المستقبِل يجمع الأجزاء ويرتبها لتعود الصورة أو الرسالة إلى شكلها الأصلي.",
      durationSeconds: 5,
      layout: "split",
      background: "#201d35",
      blocks: [
        { id: "demo-03-heading", kind: "heading", content: "تعود المعلومات متكاملة" },
        { id: "demo-03-body", kind: "body", content: "تصل الحزم ثم يعاد ترتيبها وتجميعها في الوجهة" },
        { id: "demo-03-metric", kind: "metric", content: "03" }
      ]
    },
    {
      id: "demo-scene-04",
      title: "مراحل الرحلة",
      narration: "يمكن تبسيط الرحلة في ثلاث مراحل: إرسال البيانات، توجيه الحزم عبر الشبكة، ثم استقبالها في الجهاز المقصود.",
      durationSeconds: 5,
      layout: "timeline",
      background: "#172338",
      blocks: [
        { id: "demo-04-heading", kind: "heading", content: "من الإرسال إلى الوصول" },
        { id: "demo-04-body", kind: "body", content: "مراحل قصيرة مترابطة تنقل البيانات" },
        { id: "demo-04-step-1", kind: "step", content: "الإرسال" },
        { id: "demo-04-step-2", kind: "step", content: "التوجيه" },
        { id: "demo-04-step-3", kind: "step", content: "الاستقبال" }
      ]
    },
    {
      id: "demo-scene-05",
      title: "ملخص بصري",
      narration: "الخلاصة: تقسيم البيانات إلى حزم، توجيهها عبر الشبكة، ثم إعادة تجميعها عند الوصول.",
      durationSeconds: 5,
      layout: "stats",
      background: "#211f38",
      blocks: [
        { id: "demo-05-heading", kind: "heading", content: "ثلاث أفكار أساسية" },
        { id: "demo-05-body", kind: "body", content: "هذه هي الصورة المبسطة لرحلة البيانات" },
        { id: "demo-05-metric-1", kind: "metric", content: "01" },
        { id: "demo-05-metric-2", kind: "metric", content: "02" },
        { id: "demo-05-metric-3", kind: "metric", content: "03" },
        { id: "demo-05-label-1", kind: "shape", content: "تقسيم البيانات" },
        { id: "demo-05-label-2", kind: "shape", content: "توجيه الحزم" },
        { id: "demo-05-label-3", kind: "shape", content: "إعادة التجميع" }
      ]
    }
  ]
};
