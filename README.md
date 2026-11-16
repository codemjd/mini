# ورشة الشرارات Mini

ورشة عربية لصناعة ألعاب 2D من الهاتف والمتصفح. الإصدار 0.9 يضم محرر مشاهد متعددًا، مكتبة عناصر متجهية، حركات أساسية، خلفيات مستقلة، ونظامًا أوليًا لتأليف قواعد اللعب دون كتابة كود. يركز المشروع على ثلاث أولويات: **مشهد مرسوم بعناية، لعبة مصغّرة قابلة للعب، ومساعد أوامر محلي لا يعتمد على الذكاء الاصطناعي**.

## جرّب الورشة

https://codemjd.github.io/mini/

فرع الأساس الحالي: `engine/melonjs-runtime-foundation` (طلب الدمج #2 ما زال مسودة حتى اكتمال مراجعة المرحلة الأولى).

## الأساس الحالي — Spark Editor + melonJS Runtime

- ساحة خضراء مرسومة بأسلوب كرتوني باستخدام أشكال ورسوم متجهة داخل عارض Canvas 2D مملوك للورشة.
- شخصية مستكشف وحارس وحش، مع ظلال وتفاصيل وألوان متناسقة.
- لعبة بداية جاهزة: تحرّك واجمع البلورات الأربع، وابتعد عن الحارس أو اقترب منه واستخدم الهجوم.
- تحكم بالأسهم أو WASD على الكمبيوتر، وأزرار لمس على الهاتف.
- تأثير بصري عند جمع البلورات، ورسالة عند إكمال التحدي.
- محرر مشهد يسمح بإضافة الشخصيات والأعداء والصناديق والمنصات والبلورات، وسحبها وتعديل خصائصها.
- حفظ محلي على الجهاز، وتراجع وإعادة، واستيراد وتصدير بيانات المشروع بصيغة JSON.
- مساعد عربي حتمي يعمل داخل المتصفح، دون إرسال الأوامر إلى خادم ودون استدعاء نموذج AI.

## المحرر ومحرك التشغيل

- محرر المشاهد مستقل عن Phaser ويستخدم `SparkEditorCanvas`.
- وحدة `SparkEditorController` مستقلة عن نقطة تشغيل الواجهة.
- melonJS 20.15.1 مسؤول عن المعاينة القابلة للعب، مع إدخال لوحة المفاتيح واللمس.
- نموذج المشروع من الإصدار الخامس متعدد المشاهد، مع ترحيل تلقائي من صيغ v1 إلى v4.
- إدارة حتى 30 مشهدًا داخل المشروع: إنشاء، تبديل، نسخ، إعادة تسمية، وحذف مع حماية المشهد الأخير.
- لكل مشهد عناصره وSpark Script الخاص به، مع حفظ تلقائي مستقل وتصدير/استيراد المشروع كاملًا.
- تصدير/استيراد JSON، والتراجع والإعادة، وقفل العناصر وترتيبها.
- مساحة Spark Script الاختيارية لتنفيذ أوامر محددة وآمنة.
- محرر قواعد مرئي لكل مشهد: 5 أحداث و5 إجراءات، بحد أقصى 24 قاعدة، مع حفظ مستقل وتشغيلها في معاينة melonJS.

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

هذه بداية وليست محرك ألعاب مكتملًا. المكتبة الحالية متجهية وبرمجية وليست بعد مستودع Sprite Sheets أو ملفات PNG/WebP مرخصة. يوجد الآن محرر أولي لقواعد الحدث/الإجراء، لكنه لا يوفر بعد شروطًا مركبة أو محرر عقد أو شروطًا مخصصة. كما ينقصها تحديد متعدد، ومحرر تصادم ومنصات متقدم، وتصدير HTML5/ZIP مستقل وإصدار APK موقّع للنشر. يوجد الآن مسار CI يُنتج APK تجريبيًا (Debug)، لكنه لم يُعتمد بعد بعد اختبار التثبيت والتشغيل على جهاز Android فعلي. الرسومات الحالية مرسومة برمجيًا داخل المشهد وليست حزمة رسومات تجارية أو مولّدة. المساعد يعمل بقائمة أوامر محددة، وليس ذكاءً اصطناعيًا حرًا.

ملف JSON يحفظ بيانات المشروع ولا يمثل تطبيقًا قابلًا للتثبيت. بناء APK التجريبي متاح عبر GitHub Actions؛ أما اعتماد إصدار قابل للتوزيع فيتطلب اختبارًا على جهاز فعلي وإعداد توقيع إصدار مناسب.


## Spark Engine preview foundation (0.7.0)

The play-preview now runs through an independent Spark runtime layer built around a versioned scene model, a fixed-step simulation loop, modular movement/AI/combat/collectible systems, a time manager, and a melonJS renderer. The editor now uses Spark-owned Canvas 2D rendering and pointer manipulation; the play preview uses melonJS. The two layers share the versioned Spark project model without requiring a second game engine in the editor.

See [the extraction notes](docs/ENGINE-EXTRACTION.md) and [third-party notices](THIRD_PARTY_NOTICES.md) for architecture and licensing details.


## Runtime engine

The play preview uses **melonJS 20.15.1**. The scene editor uses Spark-owned Canvas 2D rendering and input, with a renderer-independent project document schema. Spark keeps its own behavior systems and deterministic local assistant.

Official integrations currently include Tiled Inflate, the Gamepad plugin, the optional Debug Panel, and Capacitor lifecycle support. Spine is intentionally excluded pending a separate runtime license review; more advanced physics adapters remain deferred until a game requires them.


## melonJS runtime integration — 0.7.0

The preview runtime now uses melonJS 20.15.1 with:
- Built-in SAT sensor bodies and collision lifecycle callbacks connected to Spark gameplay systems.
- Official virtual gamepad plugin for touch joystick/button input and unified keyboard/gamepad actions.
- Official Tiled Inflate plugin for compressed Tiled maps.
- Optional Debug Panel, loaded only when ?debug=1 is present; F1 toggles it.
- TexturePacker/Aseprite-compatible atlas loading and animated Sprite factory.
- Conditional Capacitor lifecycle integration for native builds.

Android packaging is configured through Capacitor 8. CI scaffolds a clean Android project, builds a debug APK and uploads it as an artifact. This does not replace testing on a physical Android device.

The editor is now split into a dedicated Canvas 2D renderer and `SparkEditorController`; project storage is versioned as v5 with automatic v1/v2/v3/v4 migration. Multi-scene editing is implemented with a 30-scene project limit, isolated object/script/rule state, scene duplication/renaming/deletion, and whole-project persistence. A first no-code event/action rule editor supports five triggers and five fixed actions per scene (24-rule cap), with bounded values and no arbitrary code execution. Remaining product work includes multi-select, richer asset workflows, composite rule conditions/node graphs, and physical-device validation.


## Optional professional editing — Spark Script

Advanced users can use a small, restricted command language to modify scene data in one undoable transaction. It supports \`set\`, \`spawn\`, \`remove\`, and \`note\`; it does not evaluate JavaScript or expose browser, network, or file APIs. See [Spark Script documentation](docs/SPARK-SCRIPT.md). This is a scene-edit scripting aid, not a general gameplay scripting runtime.


## Editor renderer migration

The scene editor canvas and pointer/drag handling are now Spark-owned Canvas 2D code. Phaser is no longer required by the editor or preview bundle. melonJS remains the preview/game runtime; keeping these responsibilities separate avoids running two game engines for editing and playing.


## Stage 1 foundation — editor separation and project lifecycle

- The scene editor controller is isolated in `src/editor/editor-controller.ts`; the main entry point now wires UI events and renders the inspector/list only.
- Project persistence uses schema v5 with up to 30 scenes under a versioned storage key. Existing v1/v2/v3/v4 local saves migrate automatically on first open; rules are empty when migrating older scenes.
- Imported object IDs are normalized to a safe character set and made unique before they can reach editor list markup.
- Status messages use text nodes, not HTML string interpolation.
- The optional Spark Script remains a restricted command language, and script edits participate in undo/redo.


## Stage 1 acceptance boundary

See [Stage 1 acceptance and deferred scope](docs/STAGE-1-ACCEPTANCE.md) for the exact feature boundary and the remaining physical-device/release gates.
