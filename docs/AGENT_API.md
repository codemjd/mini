# واجهة أوامر الوكيل المحلي

هذه الواجهة هي طبقة التحكم البرمجية الضيقة التي تجعل Explainer Studio قابلًا للتشغيل بواسطة وكيل آلي بدل الاعتماد على النقر اليدوي فقط.

## الوصول

بعد تحميل التطبيق في المتصفح، تتوفر الواجهة:

```ts
window.explainerStudio.execute(command)، و`window.explainerStudio.generateNarration(projectId, sceneId)`، و`window.explainerStudio.render(project)`
```

الواجهة لا تقبل JavaScript حرًا ولا تنفذ طلبات شبكة. كل الأوامر تعمل على قاعدة المشاريع المحلية في نفس المتصفح.

## شكل النتيجة

نجاح:
```json
{ "ok": true, "data": { "...": "..." } }
```

فشل:
```json
{ "ok": false, "error": "رسالة مفهومة", "details": [] }
```

## أنواع المشاهد البصرية

تدعم صيغة المشهد الآن التخطيطات `title` و`split` و`diagram` و`timeline` و`stats` و`quote` و`comparison` و`flow`. يمكن بناء الخط الزمني أو مسار المراحل أو المقارنة بإضافة عناصر `step` إلى `blocks`، وبناء لوحة الإحصاءات بإضافة حتى ثلاثة عناصر `metric`. جميع العناصر نصية ومتجهة؛ لا يوجد دعم لاستيراد صور لشخصيات حية أو إضافة مسار موسيقي.

مثال مشهد خط زمني:
```json
{
  "id": "scene-timeline",
  "title": "مراحل العملية",
  "narration": "تمر العملية بثلاث مراحل مترابطة.",
  "durationSeconds": 8,
  "layout": "timeline",
  "background": "#182236",
  "blocks": [
    { "id": "step-1", "kind": "step", "content": "البداية" },
    { "id": "step-2", "kind": "step", "content": "التحول" },
    { "id": "step-3", "kind": "step", "content": "النتيجة" }
  ]
}
```

## الأوامر الحالية

| الأمر | المدخلات | النتيجة |
|---|---|---|
| `project.list` | لا شيء | المشاريع المحفوظة |
| `project.create` | `title` | مشروع جديد محفوظ |
| `project.open` | `projectId` | مشروع محفوظ |
| `project.export` | `projectId` | JSON مُنسّق مع اسم الملف ونوع MIME |
| `project.save` | `project` | التحقق والحفظ |
| `project.update` | `projectId`, `patch` | تحديث العنوان والوصف والإعدادات |
| `project.replaceScenes` | `projectId`, `scenes` | استبدال مخطط المشاهد دفعة واحدة بعد التحقق |
| `project.delete` | `projectId` | حذف محلي |
| `project.validate` | `project` | نتيجة التحقق |
| `scene.add` | `projectId`, `title?` | إضافة مشهد |
| `scene.update` | `projectId`, `sceneId`, `patch` | تعديل مشهد، بما في ذلك مرجع ملف التعليق الصوتي |
| `generateNarration` (جسر مباشر) | `projectId`, `sceneId`, `options?` | توليد صوت عربي محليًا وربطه بالمشهد، مع تقدم اختياري وإشارة إلغاء |
| `scene.remove` | `projectId`, `sceneId` | حذف مشهد |
| `scene.reorder` | `projectId`, `sceneId`, `toIndex` | تغيير الترتيب |

## أمثلة

إنشاء مشروع:
```js
await window.explainerStudio.execute({
  type: "project.create",
  title: "كيف تعمل الأقمار الصناعية؟"
});
```

إضافة مشهد:
```js
await window.explainerStudio.execute({
  type: "scene.add",
  projectId: "PROJECT_ID",
  title: "مدار القمر الصناعي"
});
```

تعديل عنوان مشهد:
```js
await window.explainerStudio.execute({
  type: "scene.update",
  projectId: "PROJECT_ID",
  sceneId: "SCENE_ID",
  patch: { title: "كيف يحافظ القمر على مداره؟" }
});
```



تحديث وصف المشروع:
```js
await window.explainerStudio.execute({
  type: "project.update",
  projectId: "PROJECT_ID",
  patch: {
    title: "كيف تعمل الأقمار الصناعية؟",
    description: "شرح بصري مبسط للمدارات والاتصال."
  }
});
```

استبدال Storyboard كاملًا:
```js
await window.explainerStudio.execute({
  type: "project.replaceScenes",
  projectId: "PROJECT_ID",
  scenes: [/* مصفوفة مشاهد وفق صيغة Scene */]
});
```

هذا الأمر مخصص للوكيل الذي يبني Storyboard كاملًا من موجز إنتاجي. تُفحص كل المشاهد والعناصر والألوان والمدد قبل حفظ أي تغيير.

## توليد التعليق الصوتي من الوكيل

بعد حفظ نص التعليق في المشهد، يستطيع الوكيل استدعاء:

```js
const narration = await window.explainerStudio.generateNarration(
  "PROJECT_ID",
  "SCENE_ID",
  {
    onProgress: ({ phase, progress, detail }) => {
      console.log(phase, progress, detail);
    }
  }
);
```

تعيد العملية `assetId` و`size` و`sampleRate` و`durationSeconds` ووسيلة التنفيذ (`webgpu` أو `wasm`). تحفظ WAV في IndexedDB وتربطه بالمشهد عبر `scene.update`. يمكن تمرير `signal: AbortSignal` لإيقاف العملية بين المقاطع؛ لا يمكن إيقاف استدلال ONNX الجاري فورًا.

القيود: Nabra تجريبي، صوت واحد بالفصحى، لا يضيف التشكيل تلقائيًا، وحد النص 2400 محرف في المشهد الواحد. يجب اختبار وضوح النطق وزمن التوليد على الجهاز الفعلي قبل الاعتماد عليه.
## تصيير الفيديو من الوكيل

بعد موافقة المستخدم على إشعار خصوصية التصيير داخل واجهة التطبيق، تتوفر:
- `window.explainerStudio.render(project, options?)`: يعيد `Promise<Blob>` لملف MP4.
- `window.explainerStudio.renderAndDownload(project, fileName?, options?)`: يصيّر الفيديو ويبدأ تنزيل MP4، ثم يعيد اسم الملف وحجمه ونوعه.

إذا لم تُقبل الموافقة بعد، يرفض الجسر التصيير برسالة واضحة. لا تتجاوز الموافقة هذه الحماية ولا تُحفظ تلقائيًا بعد إعادة تحميل الصفحة.

## حدود الأمان

- الواجهة متاحة داخل سياق صفحة التطبيق نفسها فقط.
- لا يوجد endpoint عام يقبل أوامر من الإنترنت.
- لا توجد إمكانية تنفيذ كود عشوائي أو تشغيل shell.
- كل مشروع يبقى في تخزين المتصفح المحلي.
- أوامر الحفظ والاستيراد والفتح تمر عبر فاحص schema؛ تُطبّع المشاريع القديمة إلى سياسة آمنة عند فتحها أو حفظها.
- يحتوي المشروع على `contentPolicy` بقيم ثابتة: `livingCharacters: false` و`music: false`. لا يمكن للأوامر تفعيل الشخصيات الحية أو الموسيقى؛ يرفض فاحص schema أي قيمة مخالفة.
- تُسلسل الأوامر داخل الصفحة لمنع تصادم عمليتي تعديل متزامنتين على نسخة قديمة من المشروع.
- `project.export` يعيد JSON بعد إعادة التحقق من سلامة المشروع.
- لا تتضمن الواجهة بعد أوامر للبحث والتحقق من المصادر أو توليد السيناريو تلقائيًا أو فحص ملف MP4. توليد التعليق الصوتي متاح عبر الجسر، لكنه تجريبي ويحتاج اختبارًا على Android. التصيير المحلي متاح بعد موافقة المستخدم، لكنه ما زال محدودًا بقدرات المتصفح.

## مبدأ التنفيذ

يجب أن تستخدم الواجهة المرئية ووكيل الذكاء الاصطناعي الأوامر نفسها. إذا احتاجت ميزة جديدة، نضيف أمرًا typed واضحًا ونتيجة قابلة للتشخيص بدل الاعتماد على محاكاة النقرات أو كتابة كود عشوائي.
