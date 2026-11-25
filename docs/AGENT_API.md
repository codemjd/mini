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

## الأوامر الحالية

| الأمر | المدخلات | النتيجة |
|---|---|---|
| `project.list` | لا شيء | المشاريع المحفوظة |
| `project.create` | `title` | مشروع جديد محفوظ |
| `project.open` | `projectId` | مشروع محفوظ |
| `project.save` | `project` | التحقق والحفظ |
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

## حدود الأمان

- الواجهة متاحة داخل سياق صفحة التطبيق نفسها فقط.
- لا يوجد endpoint عام يقبل أوامر من الإنترنت.
- لا توجد إمكانية تنفيذ كود عشوائي أو تشغيل shell.
- كل مشروع يبقى في تخزين المتصفح المحلي.
- أوامر الحفظ والاستيراد تمر عبر فاحص schema قبل الكتابة.
- لا تتضمن الواجهة بعد أوامر لتوليد الصوت أو تصيير الفيديو أو فحص ملف MP4؛ تلك تحتاج واجهات منفصلة بعد اكتمالها واختبارها.

## مبدأ التنفيذ

يجب أن تستخدم الواجهة المرئية ووكيل الذكاء الاصطناعي الأوامر نفسها. إذا احتاجت ميزة جديدة، نضيف أمرًا typed واضحًا ونتيجة قابلة للتشخيص بدل الاعتماد على محاكاة النقرات أو كتابة كود عشوائي.
