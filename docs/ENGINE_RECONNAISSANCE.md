# تشريح Godot — المرحلة الأولى

## قرار الإصدار

اعتمدنا Godot **4.7.2-stable** كأساس أولي. في 28 نوفمبر 2026 كان هذا هو الإصدار المستقر الظاهر في أرشيف الإصدارات الرسمي، بينما كان 4.8 في مرحلة Release Candidate 1. تثبيت الإصدار المستقر يقلل احتمال تغيّر واجهات المحرر أثناء بناء الإضافة والمنهج.

مرجع الوسم الرسمي: https://github.com/godotengine/godot/releases/tag/4.7.2-stable  
Commit الوسم: ed1daf0

## تقسيم معماري أولي

| الطبقة | المسار الرسمي | الدور |
|---|---|---|
| محرك التشغيل والأنظمة الأساسية | core/ و servers/ و scene/ | الكائنات، الموارد، المشاهد، الرسوم، الفيزياء، الصوت |
| محرر المشاريع | editor/ | إدارة المشروع والمحرر وشجرة المشهد والمفتش ولوحات العمل |
| واجهة إضافات المحرر | EditorPlugin / EditorInterface | إضافة لوحات وأدوات دون نسخ المحرك أو تغيير سلوكه الأساسي |
| واجهة Android | platform/android/java/editor/ | نشاط Android، الصلاحيات، النوافذ، تشغيل اللعبة المضمن، الربط مع المحرر |
| بناء Android الأصلي | platform/android/ و SCons | المكتبات الأصلية وملفات APK للمحرر |

## طبقات المصدر التي فحصناها

### 1. Android Editor lifecycle

الملف:
platform/android/java/editor/src/main/java/org/godotengine/editor/BaseGodotEditor.kt

هذا الملف ليس المحرك الرسومي. إنه طبقة Android التي تدير دورة حياة Activity، والأذونات، وIntent فتح المشاريع، وتعدد نوافذ المحرر واللعبة، ووضع تشغيل اللعبة، ومزود بناء Gradle، وبعض إيماءات اللمس.

رابط الملف في Godot 4.7.2:
https://github.com/godotengine/godot/blob/4.7.2-stable/platform/android/java/editor/src/main/java/org/godotengine/editor/BaseGodotEditor.kt

### 2. جسر المحرر

الملف:
editor/editor_interface.cpp

هذا جزء من واجهة C++ التي تتيح لمكونات المحرر والإضافات الوصول إلى خدمات المحرر. نستخدم واجهة المحرر المعلنة قبل إضافة تغييرات منخفضة المستوى.

https://github.com/godotengine/godot/blob/4.7.2-stable/editor/editor_interface.cpp

### 3. إعداد بناء محرر Android

الملف:
platform/android/java/editor/build.gradle

يبني تطبيق Android للمحرر ويحتوي على إعدادات الإصدار والتوقيع. لا يكفي تعديل ملف Gradle وحده لبناء محرر مخصص؛ تحتاج أيضًا إلى المكتبات الأصلية التي ينتجها SCons.

https://github.com/godotengine/godot/blob/4.7.2-stable/platform/android/java/editor/build.gradle

### 4. إعداد Android Native

الملف:
platform/android/detect.py

في الوسم 4.7.2-stable الذي راجعناه:
- إصدار NDK المطلوب: 29.0.14206865.
- الحد الأدنى لـ Android API: 24.

أما platform/android/java/app/config.gradle فيحدد:
- compileSdk: 36.
- targetSdk: 36.
- buildTools: 36.1.0.
- ndkVersion: 29.0.14206865.

## الترجمة العربية وRTL

وجدنا أن Godot نفسه يحتوي على ملف ترجمة عربية رسمي:
editor/translations/editor/ar.po

راجعنا هذا الملف في Godot 4.7.2، ويحتوي على آلاف مفاتيح واجهة المحرر، مع وجود بعض السلاسل غير المترجمة. لذلك لا نبدأ الترجمة من الصفر ولا نزعم اكتمالها.

الملف:
https://github.com/godotengine/godot/blob/4.7.2-stable/editor/translations/editor/ar.po

إعداد اللغة:
editor/settings/editor_settings.cpp

الإعداد:
interface/editor/localization/editor_language

يستخدم Godot القيمة auto افتراضيًا، ويقارن لغة النظام باللغات المتاحة. كذلك يوفّر:
interface/editor/localization/ui_layout_direction

والقيمة الافتراضية لاتجاه الواجهة مرتبطة بلغة التطبيق. في نسخة Android الخاصة بالمشروع، أضفنا Patch يجعل العربية هي اللغة الافتراضية عند أول إعداد، مع بقاء الإعداد قابلًا للتغيير.

## أول تعديل أصلي

أضفنا مورد Android عربيًا:
platform/android/java/editor/src/main/res/values-ar/strings.xml

يشمل النصوص الخاصة بأذونات Android، وقائمة تشغيل اللعبة، والتلميحات، وخيارات الكاميرا.

وأضفنا Patch مصدر C++:
editor/settings/editor_settings.cpp

التعديل محصور خلف ANDROID_ENABLED؛ يجعل لغة محرر Android الافتراضية ar، ولا يغيّر بناء Godot لسطح المكتب. لا يترجم هذا التعديل كل واجهة C++؛ بل يستفيد من ملف ar.po الموجود أصلًا.

تُطبّق هذه التعديلات من ملفات منفصلة في patches/godot-4.7.2/ قبل البناء، بدل تعديل المصدر upstream مباشرةً أو نسخ المحرك كاملًا إلى مستودع المستخدم.

## لماذا بدأنا بإضافة EditorPlugin؟

هناك ثلاث درجات مختلفة من التعديل:

1. **إضافة داخل المحرر:** أسرع وأقل مخاطرة، وتستخدم واجهات Godot المعلنة.
2. **تعديل واجهة المحرر الأصلية:** يغيّر تجربة المحرر نفسها، وقد يتطلب C++ أو Kotlin بحسب المكوّن.
3. **تعديل المحرك/أنظمة التشغيل:** أعمق تغييرًا، ويجب ألا نلجأ إليه ما لم نثبت أن واجهات الإضافة غير كافية.

النموذج الحالي ينفذ الدرجة الأولى في الدروس، مع أول تعديلين محدودين للموارد وإعداد اللغة في مصدر Android/المحرر.

## ملفات أخرى يجب مواصلة تشريحها

- editor/editor_node.cpp — إدارة المحرر الرئيسي وتكوين الواجهات.
- editor/editor_interface.cpp / .h — واجهة الوصول إلى المحرر.
- editor/editor_settings.cpp — الإعدادات الافتراضية والتوطين.
- editor/translations/editor/ar.po — قاموس واجهة Godot العربية.
- platform/android/java/editor/ — واجهة Android وطبقة التفاعل مع النوافذ.
- platform/android/java/editor/src/main/res/ — موارد الواجهة والأيقونات والثيمات.
- platform/android/java/editor/build.gradle — بناء تطبيق المحرر.

## سجل التعديل وضوابطه

- لا نعدّل ملفات core إلا بوجود حاجة مثبتة.
- لا نغيّر Renderer الافتراضي عالميًا دون اختبار.
- كل تعديل أصلي Patch مستقل، مع سبب وملف متأثر واختبار رجوع.
- لا ندمج مفاتيح API في المستودع أو APK.
- نثبت commit المصدر بدقة عند إنتاج APK، لا نستخدم فرع master المتغير.
- لا نعلن نجاح APK قبل نجاح Gradle/SCons، وفحص الـ artifact، وتجربة التثبيت والتشغيل على جهاز Android فعلي.
