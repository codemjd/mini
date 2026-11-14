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


## Spark Engine preview foundation (0.7.0)

The play-preview now runs through an independent Spark runtime layer built around a versioned scene model, a fixed-step simulation loop, modular movement/AI/combat/collectible systems, a time manager, and a melonJS renderer. The editor now uses Spark-owned Canvas 2D rendering and pointer manipulation; the play preview uses melonJS. The two layers share the versioned Spark project model without requiring a second game engine in the editor.

See [the extraction notes](docs/ENGINE-EXTRACTION.md) and [third-party notices](THIRD_PARTY_NOTICES.md) for architecture and licensing details.


## Runtime engine

The play preview uses **melonJS 20.15.1**. The scene editor uses Spark-owned Canvas 2D rendering and input, with a renderer-independent project document schema. Spark keeps its own behavior systems and deterministic local assistant.

The first selected official add-on is the Tiled Inflate plugin for compressed Tiled maps. Physics adapters, Spine animation, virtual gamepad, debugging tools, and Capacitor are staged separately after compatibility and device checks.


## melonJS runtime integration — 0.7.0

The preview runtime now uses melonJS 20.15.1 with:
- Built-in SAT sensor bodies and collision lifecycle callbacks connected to Spark gameplay systems.
- Official virtual gamepad plugin for touch joystick/button input and unified keyboard/gamepad actions.
- Official Tiled Inflate plugin for compressed Tiled maps.
- Optional Debug Panel, loaded only when ?debug=1 is present; F1 toggles it.
- TexturePacker/Aseprite-compatible atlas loading and animated Sprite factory.
- Conditional Capacitor lifecycle integration for native builds.

Android packaging is configured through Capacitor 8. CI scaffolds a clean Android project, builds a debug APK and uploads it as an artifact. This does not replace testing on a physical Android device.

The native Canvas 2D editor renderer is now in place. The remaining editor migration work is feature parity, multi-scene editing, richer asset workflows, and physical-device validation.


## Optional professional editing — Spark Script

Advanced users can use a small, restricted command language to modify scene data in one undoable transaction. It supports \`set\`, \`spawn\`, \`remove\`, and \`note\`; it does not evaluate JavaScript or expose browser, network, or file APIs. See [Spark Script documentation](docs/SPARK-SCRIPT.md). This is a scene-edit scripting aid, not a general gameplay scripting runtime.


## Editor renderer migration

The scene editor canvas and pointer/drag handling are now Spark-owned Canvas 2D code. Phaser is no longer required by the editor or preview bundle. melonJS remains the preview/game runtime; keeping these responsibilities separate avoids running two game engines for editing and playing.
