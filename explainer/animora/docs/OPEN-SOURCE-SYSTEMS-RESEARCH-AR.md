# Animora — دراسة الأنظمة الجاهزة ومصادر الإلهام الهندسي

**تاريخ البحث:** 2026-11-20  
**الفرع:** `animora/professional-studio-continuation`  
**قاعدة:** الاستفادة من الأنظمة تعني تحليل البنية والمبادئ أو استخدام مكتبة بعد مراجعة ترخيصها وتوافقها؛ لا نسخ واجهة/أصول/كود محمي، ولا استبدال مشروع Animora بالكامل.

## القرار المختصر
Animora يحتاج **مزيجًا انتقائيًا** لا محركًا واحدًا ضخمًا:
- نموذج مشروع وبيانات Animora يبقى المصدر الموحد للحقيقة.
- كاميرا المشهد تكون transform مستقلًا على مستوى viewport/rendering.
- motion presets تكون بيانات قابلة لإعادة الاستخدام فوق محرك keyframes الموجود.
- لا نستورد محررًا كاملًا أو timeline متضخمًا إلى مشروعنا.
- ندرس محركات التصدير فقط بعد فحص توافق المتصفح/الهاتف والحقوق.

## الأنظمة التي تستحق تفكيكًا

| المشروع | ماذا ندرس؟ | قرار مبدئي | ملاحظات/مخاطر |
|---|---|---|---|
| [Excalimate](https://github.com/excalimate/excalimate) | sequence/scene actions، اقتراحات AI staged diff، كاميرا pan/zoom، preset reveal، timeline وexport-runtime فصل | **LEARN / inspect deeper** | المصدر يذكر أن أجزاء كبيرة AI-generated وما زالت تحتاج تنظيفًا؛ لا نأخذ اعتمادًا حاسمًا قبل اختبار الكود والترخيص |
| [Motion Canvas](https://github.com/motion-canvas/motion-canvas) | أسلوب generator/tween، تنظيم المشاهد، voice-over sync، preview مقابل render، دقة/معدل إطارات مستقل | **LEARN** | MIT؛ موجه للأنيميشن البرمجي ومختلف عن محرر لمس مباشر. FFmpeg exporter موصوف بأنه حديث نسبيًا في docs |
| [Motion (motion.dev)](https://github.com/motiondivision/motion) | easing/springs/gestures وتحريك واجهة React | **ADOPT selectively** | MIT؛ مكتبة واجهة/حركة، ليست محرك فيديو أو timeline |
| [Animora SVG editor (itsrajverma)](https://github.com/itsrajverma/animora) | motion paths، keyframe rows، bezier easing، masks، templates، renderer واحد للمعاينة/التصدير | **LEARN / inspect** | MIT؛ مشروع منفصل يحمل اسم Animora، لا نفترض علاقة بالمشروع الحالي |
| [MyMotionStudio](https://github.com/rodolphe37/my-motion-studio) | offline-first 2D/3D، scenes، keyframe/easing، transitions، media export، autosave | **LEARN** | تحقق من LICENSE ومكتباته قبل اقتباس أي كود أو تبنٍ؛ لا نعتمد على قائمة الميزات وحدها |
| [Cutaway](https://github.com/S07K/cutaway) | audio/video compositing، captions، local transcription، masks، WebCodecs، frame-exact export | **LEARN** | AI-ready editor حديث؛ افحص الترخيص وقيود WebGPU/WASM/الذاكرة قبل الدمج |
| [brainCUT](https://github.com/swimmingbrain/braincut) | decoder + WebCodecs، Pixi compositor، audio clock، Offline audio mix/export، IndexedDB/OPFS | **LEARN** | مفيد لمعمارية الأداء والتزامن؛ لا يعني ملاءمة كامل المحرر لمشروع Explainer |
| [elah](https://github.com/elahlabs/elah) | resolver deterministic، engine/playback separation، renderer وexport workers، timeline keyframe data | **LEARN** | إطار engine لا واجهة منتج؛ راجع شروط الحزم عند الاستخدام |
| [motion-web / KINETIC](https://github.com/sfxhewitt/motion-web) | timeline gestures على الهاتف، bezier editor، keyframes، waveform، export | **LEARN ONLY** | README يذكر أنه personal non-commercial project؛ لا يُستخدم كاعتماد تجاري حتى مراجعة الترخيص وحقوق المكونات |
| [Nemo](https://github.com/mysteropodes/nemo) | graph editor، motion paths، parenting، 3D camera، effects registry | **LEARN** | مشروع واسع؛ يصلح للإلهام لا للنسخ |
| [FreeCut](https://github.com/walterlow/freecut) | multi-track editing، clips، transitions، export وproject workspace | **LEARN** | محرر عام؛ قد يضيف تعقيدًا لا يخدم explainer-first |

## الأنظمة / المكتبات الصغيرة

### Motion (React)
مرشح للـUI animations، transitions، gestures، spring effects. لا يستخدم لإنشاء timeline أو renderer فيديو. لا نضيفه قبل أن يثبت احتياج محدد؛ قد يكون نظام keyframes الحالي كافيًا.

### Motion Canvas
أقرب إلى إنتاج رسوم شرح من كود ومزامنتها مع narration. يدرس في:
- scene lifecycle
- tween scheduling
- timeline clock
- preview quality vs render quality
- exporter boundaries

لا نتبنى نظام generator كاملًا الآن لأن Animora محرر مباشر على الهاتف، وليس بيئة كتابة كود.

### WebCodecs / Web Audio / Canvas
هي APIs متصفح أساسية يمكن أن تشكل طريقًا لصادرات متقدمة. يلزم اختبارات capability وتوافق وذاكرة لكل جهاز؛ دعم API لا يضمن دعم codec معين.

## استراتيجية الاستفادة: لا نسخ المحررات كاملة

1. **Camera:** نفصل camera state عن object transform. نعتمد math model موحد للمعاينة والتصدير.
2. **Motion:** presets بيانات (from/to, duration, easing, direction) تُطبق على keyframes. تبدأ بأمثلة قليلة محسنة: fade, slide, pop, focus reveal, draw/reveal.
3. **Storyboarding:** schema بسيطة للـsuggestions: scene purpose, source paragraph, duration estimate, layout suggestion, visual objects, camera suggestion, narration timing anchors. كل اقتراح قابل للمراجعة، ولا يدعي الذكاء إذا كان heuristic.
4. **Timeline:** لا نكرر مسارات clip management الموجودة؛ نراجع gestures وsnapping وselection من المشاريع التي تتميز بها.
5. **Audio:** جدول المقاطع الموجود هو planning layer فقط. ندرس brainCUT/Cutaway/elah لتصميم audio clock وoffline mix وexport parity.
6. **Templates:** قوالب بيانات scene graph قابلة للتعديل، مع أصول مرخصة بوضوح؛ لا نبني 100 قالب غير متقن.
7. **Export:** renderer/resolver واحد بين preview وexport، ثم اختبار output decode، الصوت، المدة، frame rate وcancel/error handling.
8. **Mobile:** لا نعتمد gestures غير واضحة؛ كل gesture لها بديل واضح بزر أو property field. اختبار touch على هاتف فعلي مطلوب.

## ترخيص ومخاطر
- لا نستخدم أصولًا أو shaders أو كودًا من مشاريع مرخصة بشكل غير مناسب.
- MIT/Apache/MPL/AGPL/GPL ليست متساوية؛ يجب قراءة الترخيص لكل repo ولكل dependency قبل نسخ أو دمج.
- لا ننقل UI أو branding أو أسماء templates الخاصة بمشروع آخر.
- لا نسجل ميزة «AI» إلا إذا كان هناك provider/model حقيقي أو نوضح أنها heuristic.
- لا نعد بملف MP4 أو مزج صوت كامل قبل اختبار export حقيقي.

## المصادر الأولية (روابط مراجعة)
- Excalimate — https://github.com/excalimate/excalimate
- Motion Canvas — https://github.com/motion-canvas/motion-canvas
- Motion — https://github.com/motiondivision/motion
- SVG Animora — https://github.com/itsrajverma/animora
- MyMotionStudio — https://github.com/rodolphe37/my-motion-studio
- Cutaway — https://github.com/S07K/cutaway
- brainCUT — https://github.com/swimmingbrain/braincut
- elah — https://github.com/elahlabs/elah
- KINETIC motion-web — https://github.com/sfxhewitt/motion-web
- Nemo — https://github.com/mysteropodes/nemo
- FreeCut — https://github.com/walterlow/freecut

**هذه دراسة أولية للـREADME/المعلومات المنشورة وليست مراجعة كود كاملة أو اختبارًا أو تدقيقًا قانونيًا.**
