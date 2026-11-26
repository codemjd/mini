# تراخيص المكونات الخارجية

هذه الوثيقة تخص المكونات التي تدخل في بناء ميزة التعليق الصوتي. لا تمثل ترخيصًا عامًا للتطبيق كله.

## Nabra TTS وكود النموذج

- المصدر: https://github.com/Oddadmix/nabra-tts
- الكود والنموذج موصوفان بترخيص Apache License 2.0.
- نسخة الترخيص الأصلية محفوظة في `vendor/nabra-tts/LICENSE`.
- إشعارات المصدر الأصلي محفوظة في `vendor/nabra-tts/THIRD_PARTY_NOTICES.md`.

## eSpeak NG

- يُضمّن eSpeak NG 1.52.0 وبيانات النطق العربية والإنجليزية في وحدة Web Worker.
- الترخيص: GNU GPL version 3 أو أي إصدار أحدث.
- النص الكامل المرفق: `vendor/nabra-tts/licenses/GPL-3.0-or-later.txt`.
- ينسخ البناء النص إلى `public/vendor/nabra-tts/GPL-3.0-or-later.txt`.

## ONNX Runtime Web

- المصدر: https://github.com/microsoft/onnxruntime
- الترخيص: MIT، وفق إشعار Nabra upstream.
- يجب الاحتفاظ بإشعارات الترخيص المطلوبة عند إعادة توزيع مخرجات البناء.

## أثر ذلك على التوزيع

- ترخيص Nabra Apache-2.0 لا يلغي شروط eSpeak NG GPL.
- تُنسخ الإشعارات إلى الموقع المنشور بواسطة `scripts/copy-nabra-notices.mjs` قبل بناء Vite.
- لم يحدد هذا التغيير ترخيصًا عامًا لمصدر Explainer Studio نفسه.
- قبل توزيع تطبيق مجمّع أو تجاري، يجب إجراء مراجعة قانونية لتوافق وطريقة توزيع مكوّن GPL، والاحتفاظ بالإشعارات ومصدر التعديلات المطلوبة.
