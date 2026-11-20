# Animora — تدقيق مصدر فعلي (قراءة فقط)

**الفرع:** `animora/professional-studio-continuation`  
**التاريخ:** 2026-11-20  
**النطاق:** ملفات المصدر التي أمكن استرجاعها عبر GitHub؛ لا تشغيل محلي أو تعديل كود في هذه الجولة.

## ما تأكد وجوده في المصدر

- **React + TypeScript + Vite + Zustand**: التطبيق قائم بالفعل، وليس مجرد وثائق أو تصور.
- **نموذج المشاهد** في `model/types.ts`: المشهد يحفظ عناصره وأبعاده وخلفيته ومدته وتعليقاته، مع انتقال دخول اختياري، كاميرا اختيارية، ومسارات Timeline.
- **Camera data model** في `model/camera.ts`: تمثيل enabled/keyframes، تنظيف القيم غير الصالحة، ترتيب الإطارات، وحدود Zoom بين 0.1 و8 وحدود الإزاحة ±100,000، مع حد 500 keyframe.
- **Scene state** في `state/scenes.ts`: تبديل المشهد، إنشاء/حذف/تكرار وإعادة ترتيب، ونسخ الكاميرا مع المشهد. تبديل المشاهد يصفّر الوقت والاختيار ويوقف التشغيل.
- **Timeline** في `components/Timeline.tsx`: مسارات وعناصر زمنية متعددة، keyframes، التحديد، التحرير، والـ snapping. النموذج يدعم video/audio/overlay.
- **Audio schedule** في `io/audioSchedule.ts`: بناء جدول زمني deterministic للصوت، تجاهل المسارات/المقاطع المكتومة أو غير الصالحة، مع scene offsets وplayback rate.
- **Rendering** في `engine/render.ts`: SVG renderer للمعاينة واللقطات/التصدير، لكنه يعتمد على عناصر SVG وإطاراتها؛ لم يتم تأكيد تطبيق Camera على هذا المسار من الملفات المفحوصة.
- **Quality checks** في `scripts/mobile-quality-check.mjs`: اختبارات موجودة تشمل تطبيع الكاميرا، ترحيل مشروع قديم، جدول الصوت، وZIP round-trip.

## فجوات / مخاطر يجب ألا نعتبرها منجزة

1. **Camera parity غير مثبت:** وجود Camera data وmigration/tests لا يثبت أن keyframes تُطبّق على المعاينة ولا على export. يلزم تتبع استهلاك camera من Canvas وrender/export.
2. **المعاينة والتصدير:** يجب أن يستخدما transform/renderer موحدًا أو اختبار parity يمنع اختلاف الصورة.
3. **Audio schedule ليس mixer:** الجدول الزمني لا يثبت مزج صوت فعليًا، fades/ducking، waveform decoding، أو إخراج صوت متزامن في الفيديو النهائي.
4. **الذكاء المساعد:** لم يثبت وجود مزود AI أو تحليل نص فعلي؛ لا نسمي heuristic “AI” دون خدمة أو نموذج حقيقي.
5. **توافق التصدير:** حزمة المشروع ZIP وSVG موجودة ضمن المصدر الذي تم فحصه؛ لا نستنتج MP4 أو codec أو native APK.
6. **اختبار الجهاز:** لا توجد تجربة Android حقيقية في هذه الجولة.

## قرارات التنفيذ الموصى بها بعد التدقيق

### P0 — Camera integration audit/implementation
- تحديد renderer المستخدم في Canvas والـ export.
- تعريف دالة transform للكاميرا قابلة لإعادة الاستخدام، مع مركز المشروع كمرجع وzoom/offset واضحين.
- تطبيق camera frame interpolation على الوقت الحالي، واستخدام easing بين keyframes.
- الحفاظ على scene camera منفصلة عن element transform.
- إضافة اختبارات: neutral camera، interpolation، zoom limits، scene switching، legacy migration، وpreview/export parity.
- عدم إضافة UI قبل أن تثبت المعالجة الحسابية.

### P1 — التصدير والمزامنة
- تتبع export frame path وaudio scheduling إلى encoder الفعلي.
- اختبار حدود المشاهد والانتقالات ومصادر الصوت والقص والمكتومة.
- إعلان أنواع الإخراج المدعومة فقط بعد اختبار end-to-end.

### P2 — أدوات Explainer
- توسيع العناصر إلى callout/arrows/highlights/diagram/chart/timeline، مع templates كبيانات editable.
- إنشاء storyboard helper؛ عند عدم توفر نموذج AI، تُسمى اقتراحات قواعد/heuristics بوضوح.

## نتيجة هذه الجولة

تم استرجاع وفحص أجزاء المصدر الرئيسية وتبين أن أساس المشاهد، Timeline، الكاميرا كبيانات، وجدولة الصوت موجود بالفعل. أهم خطوة الآن ليست إعادة بناء هذه الأنظمة؛ بل تتبع Camera وAudio إلى المعاينة والتصدير وإغلاق فجوة التكامل بالأدلة والاختبارات. تعذر إجراء clone وتشغيل build لأن البيئة لم تستطع الوصول إلى GitHub عبر الشبكة؛ لم يتم تعديل ملفات المصدر أو الادعاء بمرور اختبارات.
