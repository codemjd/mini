# واجهة أوامر الوكيل المحلي

هذه الواجهة هي طبقة التحكم البرمجية الضيقة التي تجعل Explainer Studio قابلًا للتشغيل بواسطة وكيل آلي بدل الاعتماد على النقر اليدوي فقط.

## الوصول

بعد تحميل التطبيق في المتصفح، تتوفر الواجهة:

```ts
window.explainerStudio.execute(command)
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

تدعم صيغة المشهد الآن التخطيطات `title` و`split` و`diagram` و`timeline` و`stats`. يمكن بناء الخط الزمني بإضافة عناصر `step` إلى `blocks`، وبناء لوحة الإحصاءات بإضافة حتى ثلاثة عناصر `metric`. جميع العناصر نصية ومتجهة؛ لا يوجد دعم لاستيراد صور لشخصيات حية أو إضافة مسار موسيقي.

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
| `scene.update` | `projectId`, `sceneId`, `patch` | تعديل مشهد |
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

## حدود الأمان

- الواجهة متاحة داخل سياق صفحة التطبيق نفسها فقط.
- لا يوجد endpoint عام يقبل أوامر من الإنترنت.
- لا توجد إمكانية تنفيذ كود عشوائي أو تشغيل shell.
- كل مشروع يبقى في تخزين المتصفح المحلي.
- أوامر الحفظ والاستيراد والفتح تمر عبر فاحص schema؛ تُطبّع المشاريع القديمة إلى سياسة آمنة عند فتحها أو حفظها.
- يحتوي المشروع على `contentPolicy` بقيم ثابتة: `livingCharacters: false` و`music: false`. لا يمكن للأوامر تفعيل الشخصيات الحية أو الموسيقى؛ يرفض فاحص schema أي قيمة مخالفة.
- تُسلسل الأوامر داخل الصفحة لمنع تصادم عمليتي تعديل متزامنتين على نسخة قديمة من المشروع.
- `project.export` يعيد JSON بعد إعادة التحقق من سلامة المشروع.
- لا تتضمن الواجهة بعد أوامر لتوليد الصوت أو تصيير الفيديو أو فحص ملف MP4. تصيير الفيديو موجود حاليًا في واجهة المستخدم كمسار محلي محدود، لكنه لم يتحول بعد إلى أمر وكيل لأن الموافقة على القياس وإدارة ملف Blob والتنزيل تحتاج واجهة صلاحيات منفصلة.

## مبدأ التنفيذ

يجب أن تستخدم الواجهة المرئية ووكيل الذكاء الاصطناعي الأوامر نفسها. إذا احتاجت ميزة جديدة، نضيف أمرًا typed واضحًا ونتيجة قابلة للتشخيص بدل الاعتماد على محاكاة النقرات أو كتابة كود عشوائي.
