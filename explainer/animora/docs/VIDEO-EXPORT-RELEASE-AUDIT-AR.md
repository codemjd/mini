# Animora — تدقيق مسار إخراج الفيديو (فجوات النسخة القابلة للإنتاج)

**تاريخ التدقيق:** 21 نوفمبر 2026  
**الفرع:** `animora/professional-studio-continuation`  
**النطاق:** مراجعة قراءة فقط لمصدر `io/files.ts`, `engine/render.ts`, `components/Canvas.tsx`, `components/AudioPreview.tsx`, `model/camera.ts`, `model/types.ts`.

## الموجود فعلًا
- تصدير WebM باستخدام Canvas `captureStream(fps)` وMediaRecorder؛ إعداد bitrate للفيديو 8 Mbps، اختيار VP9 ثم VP8 عند الدعم.
- تصدير WebM متعدد المشاهد مع انتقالات، وتصدير GIF، PNG/PNG sequence، SVG، وملفات المشروع.
- المعاينة الصوتية تستخدم HTMLAudioElement لمقاطع المسارات في المشهد الحالي، مع seek عند اختلاف playhead عن decoder clock.
- Renderer يولد SVG frames للمعاينة وتصدير الإطارات.

## فجوات مؤكدة في الملفات التي تم فحصها
### 1) WebM export لا يضم الصوت حاليًا
في `exportWebm` و`exportWebmScenes` يُسجل Canvas stream فقط عبر MediaRecorder. لا يوجد Audio track متصل بالـ MediaRecorder stream ضمن المسار المفحوص. وجود AudioPreview لا يعني أن صوت الفيديو المُصدر مضمّن. **هذه فجوة P0.**
### 2) كاميرا المشهد موجودة كبيانات، لكنها غير مستخدمة في renderer/Canvas
- `model/types.ts` و`model/camera.ts` يعرفان SceneCamera وkeyframes ويطبعان/ينظمان البيانات.
- `engine/render.ts` لا يحتوي أي مرجع إلى camera.
- `components/Canvas.tsx` لا يحتوي أي مرجع إلى camera.
بالتالي الكاميرا المستقلة لا يظهر أنها تؤثر في المعاينة أو الإطار المصدر. **هذه فجوة P0/P1.**
### 3) إخراج الفيديو مقيد بـ WebM في المسار المكتشف
لا يوجد exporter MP4 في الملفات التي تم فحصها. يجب عرض الصيغة بوضوح وعدم الوعد بـMP4 قبل توفير مسار موثوق.
### 4) جودة الإخراج تحتاج فحصًا end-to-end
اختبار طول الفيديو مقابل مدة المشاهد وFPS، دقة canvas وbitrate، توقف التسجيل عند الخطأ وتحرير tracks، الصوت ومزامنته، انتقالات scenes ذات مقاسات مختلفة، progress/cancel وفشل MediaRecorder.

## تعريف MVP: فيديو كامل قابل للتسليم
1. مشروع عدة scenes بمدة لكل مشهد.
2. محتوى قابل للتحرير: نصوص، shapes، SVG/صور.
3. Keyframes/Easing ومؤثرات/انتقالات.
4. كاميرا scene-level فعالة في preview وexport (zoom/pan) مع interpolation.
5. Timeline صوتي متعدد المقاطع على clock موحد.
6. WebM صادر يحتوي الفيديو والصوت معًا.
7. تحكم FPS وresolution/aspect ratio ضمن حدود الجهاز.
8. Export progress، أخطاء مفهومة، تنظيف الموارد، وعدم فقد المشروع عند فشل التصدير.
9. فتح الملف الناتج والتحقق من مدته، video track، audio track، ومزامنة الصوت.
10. مثال Explainer حقيقي 30–60 ثانية يختبر كل المسارات.

## ترتيب الإصلاح
### P0-A — Audio capture in export
- بناء AudioContext/MediaStreamDestination للمقاطع المفعلة.
- ربط audio destination track إلى stream الذي يسجله MediaRecorder.
- Clock واحد لتشغيل الفيديو والصوت.
- مراعاة clip offsets/sourceStart/duration/volume/mute وحدود scenes.
- اختبار audio track ومزامنة start/end في الملف الناتج.
### P0-B — Camera renderer integration
- وضع transform camera في مستوى scene/root بعد composition وقبل rasterization.
- نفس الحساب لـCanvas preview وframe export وanimated export، دون duplicate transforms.
- مركز zoom واضح، offset، interpolation/easing، neutral defaults وbounds.
- اختبارات camera disabled/zoom/offset/interpolation.
### P1 — Export reliability
- إعدادات resolution/FPS/aspect، fallback codec، إلغاء export وتحرير الموارد.
- اختبار scenes/transition/frame counts/progress وتسمية الملفات.
### P2 — Explainer templates
- قوالب صغيرة متقنة وقابلة للتحرير، ثم التوسعة.
- Storyboard assist باقتراحات قابلة للمراجعة؛ عدم وصف heuristics بأنها AI.

## حدود الجولة
هذا تدقيق مصدر وليس تنفيذًا أو اختبارًا: لم يتوفر تشغيل محلي/clone/build أو اختبار ملف WebM. النتائج عن Camera/audio track مبنية على الملفات المصدرية المفحوصة، وتحتاج إعادة التحقق بعد التغييرات.
