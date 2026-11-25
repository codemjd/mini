import type { StudioProject } from "../types/project";

export const demoProject: StudioProject = {
  schemaVersion: 1,
  id: "explainer-studio-render-smoke",
  title: "كيف تنتقل البيانات عبر الإنترنت؟",
  description: "اختبار مرئي لأنماط المشاهد الخمسة وسياسة المحتوى الآمنة.",
  createdAt: "2026-11-25T00:00:00.000Z",
  updatedAt: "2026-11-25T00:00:00.000Z",
  settings: { width: 1920, height: 1080, fps: 30, language: "ar" },
  contentPolicy: { livingCharacters: false, music: false },
  scenes: [
    {
      id: "demo-scene-01",
      title: "الفكرة ببساطة",
      narration: "تتحول المعلومات إلى حزم رقمية صغيرة قبل أن تبدأ رحلتها عبر الشبكة.",
      durationSeconds: 2,
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
      narration: "تقسم البيانات إلى وحدات صغيرة، وتحمل كل وحدة معلومات تساعد على توجيهها.",
      durationSeconds: 2,
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
      narration: "عند الوصول، يعاد ترتيب الحزم وتجميعها لتظهر المعلومات كاملة.",
      durationSeconds: 2,
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
      narration: "تمر الحزمة بمراحل متتابعة حتى تصل إلى الجهاز المقصود.",
      durationSeconds: 3,
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
      narration: "تساعد الحزم على نقل البيانات بكفاءة، ثم يعاد تجميعها عند الوصول.",
      durationSeconds: 3,
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
