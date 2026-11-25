import type { StudioProject } from "../types/project";

export const demoProject: StudioProject = {
  schemaVersion: 1,
  id: "explainer-studio-render-smoke",
  title: "كيف تنتقل البيانات عبر الإنترنت؟",
  description: "مشروع تجريبي ثابت لاختبار تصيير الفيديو.",
  createdAt: "2026-11-25T00:00:00.000Z",
  updatedAt: "2026-11-25T00:00:00.000Z",
  settings: { width: 1920, height: 1080, fps: 30, language: "ar" },
  contentPolicy: { livingCharacters: false, music: false },
  scenes: [
    {
      id: "demo-scene-01",
      title: "الفكرة ببساطة",
      narration: "تتحول المعلومات إلى حزم رقمية صغيرة قبل أن تبدأ رحلتها عبر الشبكة.",
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
      narration: "تقسم البيانات إلى وحدات صغيرة، وتحمل كل وحدة معلومات تساعد على توجيهها.",
      durationSeconds: 4,
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
      durationSeconds: 4,
      layout: "split",
      background: "#201d35",
      blocks: [
        { id: "demo-03-heading", kind: "heading", content: "تعود المعلومات متكاملة" },
        { id: "demo-03-body", kind: "body", content: "تصل الحزم ثم يعاد ترتيبها وتجميعها في الوجهة" },
        { id: "demo-03-metric", kind: "metric", content: "03" }
      ]
    }
  ]
};
