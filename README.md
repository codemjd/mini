# ورشة الشرارات Mini

ورشة عربية لصناعة ألعاب 2D من الهاتف والمتصفح. هذه هي النسخة الأولى التي تركز على ثلاث أولويات: **مشهد مرسوم بعناية، لعبة مصغّرة قابلة للعب، ومساعد أوامر محلي لا يعتمد على الذكاء الاصطناعي**.

## جرّب الورشة

https://codemjd.github.io/mini/

## الإصدار 0.4 — رحلة البلورات

- ساحة خضراء مرسومة بأسلوب كرتوني باستخدام أشكال ورسوم متجهة داخل Phaser.
- شخصية مستكشف وحارس وحش، مع ظلال وتفاصيل وألوان متناسقة.
- لعبة بداية جاهزة: تحرّك واجمع البلورات الأربع، وابتعد عن الحارس أو اقترب منه واستخدم الهجوم.
- تحكم بالأسهم أو WASD على الكمبيوتر، وأزرار لمس على الهاتف.
- تأثير بصري عند جمع البلورات، ورسالة عند إكمال التحدي.
- محرر مشهد يسمح بإضافة الشخصيات والأعداء والصناديق والمنصات والبلورات، وسحبها وتعديل خصائصها.
- حفظ محلي على الجهاز، وتراجع وإعادة، واستيراد وتصدير بيانات المشروع بصيغة JSON.
- مساعد عربي حتمي يعمل داخل المتصفح، دون إرسال الأوامر إلى خادم ودون استدعاء نموذج AI.

## المساعد المحلي

المساعد الحالي ليس نموذج محادثة عامًا؛ إنه محرك قواعد وأوامر محددة. يحوّل الصيغ العربية المعروفة إلى إجراءات آمنة على عناصر المشروع. من أمثلته:

| الأمر | النتيجة |
|---|---|
| جهّز لعبة جمع البلورات | يعيد إنشاء لعبة البداية |
| أضف 4 بلورات | يضيف أربع عناصر قابلة للجمع |
| أضف عدوًا | يضيف حارسًا جديدًا |
| اجعل البطل أسرع | يضبط سرعة البطل إلى 260 |
| اجعل البطل أقوى | يزيد ضرر البطل |
| اجعل العدو أضعف | يقلل صحته وسرعته وضرره |
| اجعل البطل أزرق | يغيّر لون البطل |
| احذف المحدد / انسخ المحدد | يحذف أو ينسخ العنصر المختار |
| تراجع / إعادة | يستدعي تاريخ التعديلات |

الأوامر المدعومة قابلة للتوسعة من ملف src/local-assistant.ts. عندما لا يتعرف المساعد على صيغة، يوضح ذلك بدل اختراع استجابة أو الادعاء بأنه فهمها.

## تشغيل التطوير

~~~bash
npm install
npm run dev
~~~

## الفحص والبناء والاختبار

~~~bash
npm run typecheck
npm run build
npm run test:e2e
~~~

يتضمن GitHub Actions فحص TypeScript والبناء واختبارات متصفح على سطح المكتب ومحاكاة هاتف.

## الحدود الحالية

هذه بداية صغيرة وليست محرك ألعاب مكتملًا. ما زال ينقصها محرر أحداث مرئي، ومكتبة أصول فنية حقيقية قابلة للاستعراض، ومشاهد متعددة، وأنظمة تصادم ومنصات متقدمة، وتصدير HTML5/ZIP وAPK. الرسومات الحالية مرسومة برمجيًا داخل المشهد وليست حزمة رسومات تجارية أو مولّدة. المساعد يعمل بقائمة أوامر محددة، وليس ذكاءً اصطناعيًا حرًا.

ملف JSON يحفظ بيانات المشروع، ولا يمثل تطبيقًا قابلًا للتثبيت. لن نعلن جاهزية HTML5 أو APK قبل بناء حقيقي واختبار مستقل.


## Spark Engine preview foundation (0.6.0)

The play-preview now runs through an independent Spark runtime layer built around a versioned scene model, a fixed-step simulation loop, modular movement/AI/combat/collectible systems, a time manager, and a melonJS renderer. The existing Phaser editor is intentionally retained during this first migration stage; preview data is copied into the runtime so gameplay does not mutate the editable scene.

See [the extraction notes](docs/ENGINE-EXTRACTION.md) and [third-party notices](THIRD_PARTY_NOTICES.md) for architecture and licensing details.


## Runtime engine

The play preview is migrating to **melonJS 20.15.1**. Phaser is retained temporarily for the editor while the new runtime is verified. Spark keeps its own project schema, behavior systems, and deterministic local assistant.

The first selected official add-on is the Tiled Inflate plugin for compressed Tiled maps. Physics adapters, Spine animation, virtual gamepad, debugging tools, and Capacitor are staged separately after compatibility and device checks.
