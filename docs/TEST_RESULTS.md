# نتائج الاختبارات الفعلية

## اختبار تصيير Remotion الأول — 25 نوفمبر 2026

- Workflow: [Render a real Explainer Studio MP4](https://github.com/codemjd/mini/actions/runs/45627075033)
- Commit tested: `6f89f365029f9dd6e245311df106eeb7d36f3a78`
- Artifact: [explainer-studio-demo-mp4](https://github.com/codemjd/mini/actions/runs/45627075033/artifacts/15028763917)
- Composition: `ExplainerDemo`
- Duration: 12.000 seconds
- Resolution: 1920 × 1080
- Frame rate: 30 FPS (30/1)
- Video codec: H.264
- File size: 1,233,180 bytes (about 1.2 MB)
- Audio stream: none, by design for this smoke test

### ما تحقق

1. Remotion CLI أنشأ 360 إطارًا.
2. تم ترميز الملف إلى MP4 بنجاح.
3. FFprobe قرأ الملف وتأكد من codec والأبعاد ومعدل الإطارات والمدة.
4. فُكّت إطارات من الثانية 2 و6 و10 وفُحصت بصريًا.
5. ظهرت النصوص العربية باتجاه صحيح ومقروء في الإطارات التي تمت مراجعتها.
6. لم تظهر شخصيات حية أو موسيقى.

### ما لا يثبته الاختبار

- هذا اختبار تصيير على GitHub Actions/Linux، وليس تصديرًا من هاتف Android.
- لم نختبر بعد `@remotion/web-renderer` داخل متصفح الهاتف.
- لم تتم مراجعة كل إطار من الإطارات الـ360؛ تمت مراجعة ثلاث لقطات تمثيلية فقط.
- الفيديو صامت ولا يحتوي تعليقًا صوتيًا.
- التصميم الحالي نموذج تأسيسي متكرر، وليس الجودة النهائية المطلوبة.

### نتيجة الاختبار

**نجاح بوابة MP4 الأساسية على خادم CI.** لا تزال بوابة التصدير المحلي على Android، والصوت، والفيديو الطويل، ومراجعة الجودة الشاملة مفتوحة.
