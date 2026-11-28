# استراتيجية Android والهاتف المستهدف

## ما نعرفه عن المحرر الرسمي

Godot يقدم محرر Android يستطيع إنشاء وتطوير وتصدير مشاريع 2D و3D. الوثائق الرسمية تصف التجربة بأنها Early Access، وتشترط Android 5 أو أحدث مع دعم OpenGL 3 على الأقل.

القيود المعلنة في وثائق Godot 4.7:
- لا يوجد دعم C#/Mono داخل محرر Android.
- لا يدعم محررات السكربت الخارجية.
- لا يُنصح بـ Forward+ على Android بسبب الأداء.
- تجربة الاستخدام ليست محسّنة بعد لشكل الهواتف الصغيرة.
- توصي الوثائق بلوحة مفاتيح وفأرة Bluetooth لتحسين الإنتاجية.

المصدر:
https://docs.godotengine.org/en/4.7/tutorials/editor/using_the_android_editor.html

## الجهاز المستهدف

المعطيات المتاحة للمشروع:
- هاتف Xiaomi Mi A3.
- Android 11.
- RAM: 4 GB.

يجب التحقق عمليًا من دعم OpenGL 3 ومن مساحة الذاكرة المتاحة. لا نعتبر توافق النظام وحده دليلًا على أن مشروع 3D ثقيل سيعمل بسلاسة.

## قرارات الأداء الأولية

- واجهة المرشد صغيرة وقابلة للتمرير ولا تفتح صفحات كثيرة في وقت واحد.
- مشاريع التدريب الأولى 2D.
- إعداد عرض المشروع يستخدم GL Compatibility افتراضيًا.
- لا نحمّل أصولًا ضخمة أو نماذج 3D عند فتح المرشد.
- نفصل الدروس والمواد بحيث يمكن تنزيل الدروس الإضافية عند الطلب لاحقًا.
- لا نطلب لوحة مفاتيح خارجية كشرط، لكن يمكن دعمها كخيار إنتاجية.

## بناء محرر Godot Android نفسه

تشرح الوثائق الرسمية بناء محرر Android من المصدر باستخدام SCons. مثال ARM64:

scons platform=android arch=arm64 production=yes target=editor generate_android_binaries=yes

وتذكر أن الناتج يوضع في:
bin/android_editor_builds/

المتطلبات الرسمية تتضمن Python 3.9+ وSCons 4.4+ وAndroid SDK وJDK 17. ويُطلب أن يطابق المحرر وقوالب التصدير الإصدار/الالتزام البرمجي نفسه.

في نسخة Godot 4.7.2:
- NDK: 29.0.14206865.
- Android compile/target SDK: 36.
- Build Tools: 36.1.0.
- الحد الأدنى API: 24.

المراجع:
https://docs.godotengine.org/en/stable/engine_details/development/compiling/compiling_for_android.html
https://github.com/godotengine/godot/blob/4.7.2-stable/platform/android/detect.py
https://github.com/godotengine/godot/blob/4.7.2-stable/platform/android/java/app/config.gradle

## الفرق بين تطبيقين

- Godot Editor APK: التطبيق الذي يفتح المحرر لإنشاء المشاريع وتعديلها.
- لعبة Android APK: التطبيق الناتج من تصدير مشروع اللعبة.

هدفنا النهائي هو بناء محرر Godot مشتق ومحسّن للمبتدئ، وليس مجرد تصدير مثال تعليمي على أنه المحرر.

## مراحل Android

1. إثبات عمل الإضافة التعليمية في Godot 4.7.2.
2. فحص الواجهة على الهاتف وتحديد عناصر المحرر التي تحتاج تصغيرًا أو إعادة تنظيم.
3. تعديل موارد/واجهة Android Editor الأصلية بصورة محدودة.
4. بناء APK ARM64 عبر CI وإرفاقه كأثر بناء.
5. اختبار تثبيت وتشغيل فعلي على جهاز Android قبل وصفه بأنه جاهز.

لا نعلن نجاح مرحلة 4 أو 5 قبل وجود ملف APK وفحصه ثم اختباره على جهاز فعلي.
