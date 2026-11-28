@tool
# Godot Mentor ships an interactive 15-lesson starter curriculum.
extends VBoxContainer

const PROGRESS_FILE := "user://godot_mentor_progress.cfg"

const LESSONS := [
	{
		"title": "1 — العقدة Node",
		"explanation": "العقدة هي لبنة البناء الأساسية في Godot. قد تكون صورة، أو جسمًا فيزيائيًا، أو كاميرا، أو نصًا، أو حتى عقدة فارغة تنظّم بقية العناصر. كل عقدة لها نوع ووظيفة.",
		"mission": "ميّز بين العقدة والمشهد: العقدة عنصر واحد، أما المشهد فيجمع عقدة جذرًا مع أبنائها في بنية قابلة لإعادة الاستخدام.",
		"hint": "فكّر في العقدة كقطعة واحدة في مجموعة بناء. يمكن أن تكون القطعة نفسها مستقلة أو جزءًا من مجموعة أكبر.",
		"snippet": """extends Node2D

func _ready() -> void:
	print("أنا عقدة داخل المشهد")""",
		"question": "أي عبارة تصف Node في Godot بدقة؟",
		"options": [
			"ملف صورة فقط",
			"عنصر أساسي له نوع ووظيفة ويمكن أن يكون له أبناء",
			"ملف المشروع كاملًا"
		],
		"correct": 1,
		"feedback": "العقدة عنصر أساسي في شجرة المشهد، ولكل نوع منها خصائص وسلوك مختلف."
	},
	{
		"title": "2 — المشهد Scene",
		"explanation": "المشهد بنية من العقد تبدأ بعقدة جذر. قد يمثل لاعبًا أو قائمة أو مرحلة كاملة. تستطيع حفظ المشهد وإعادة استخدامه داخل مشاهد أخرى.",
		"mission": "تخيّل لاعبًا يتكوّن من CharacterBody2D، وSprite2D، وCollisionShape2D. اجعل CharacterBody2D هو الجذر، وأضف العنصرين الآخرين أبناءً له.",
		"hint": "شجرة العقد تصف العلاقة بين العناصر. الجذر يملك أبناءه، وعند تحريك الجذر يتحرك تكوين اللاعب كله.",
		"snippet": """Player (CharacterBody2D)
├── Sprite2D
└── CollisionShape2D""",
		"question": "ما الفائدة الأساسية من حفظ مجموعة عقد كمشهد؟",
		"options": [
			"إعادة استخدامها كوحدة واحدة",
			"تحويلها تلقائيًا إلى صورة",
			"إلغاء شجرة العقد"
		],
		"correct": 0,
		"feedback": "المشهد يسمح بتجميع بنية كاملة وإعادة استخدامها كمكوّن في اللعبة."
	},
	{
		"title": "3 — أول سكربت",
		"explanation": "تضيف السكربت إلى عقدة لكي تمنحها سلوكًا. في GDScript تبدأ غالبًا بتحديد نوع العقدة عبر extends، ثم تكتب الدوال والمتغيرات التي تتحكم بها.",
		"mission": "اقرأ المثال، وحدد السطر الذي يُنفّذ مرة عند دخول العقدة إلى شجرة المشهد. جرّب نسخ المثال وإرفاقه بعقدة Node2D.",
		"hint": "الدالة _ready تعمل عندما تصبح العقدة جاهزة داخل شجرة المشهد. أما _process فتعمل كل إطار.",
		"snippet": """extends Node2D

@export var speed: float = 220.0

func _ready() -> void:
	print("بدأت اللعبة")""",
		"question": "متى تعمل الدالة _ready؟",
		"options": [
			"مرة عند جاهزية العقدة داخل شجرة المشهد",
			"كل إطار طوال اللعبة",
			"فقط عند إغلاق المحرر"
		],
		"correct": 0,
		"feedback": "_ready نقطة مناسبة لتهيئة العقدة بعد دخولها شجرة المشهد."
	},
	{
		"title": "4 — الحركة الفيزيائية",
		"explanation": "CharacterBody2D مخصص للشخصيات والأجسام التي تتحكم بحركتها برمجيًا مع الاستفادة من التصادم. تحدد velocity ثم تستدعي move_and_slide داخل _physics_process.",
		"mission": "أنشئ مشهد تدريب فعليًا بزر واحد. افتح المشهد الناتج ثم شغّله وجرب الأسهم. هذا المثال بداية تعليمية وليس نظام حركة كاملًا.",
		"hint": "Input.get_vector تجمع اتجاهات اليسار واليمين والأعلى والأسفل في متجه واحد. ضرب المتجه في speed يجعل سرعة الحركة ثابتة قطريًا أيضًا.",
		"snippet": """extends CharacterBody2D

@export var speed: float = 240.0

func _physics_process(_delta: float) -> void:
	var direction := Input.get_vector(
		"ui_left", "ui_right", "ui_up", "ui_down"
	)
	velocity = direction * speed
	move_and_slide()""",
		"question": "أي تسلسل مناسب لتحريك CharacterBody2D؟",
		"options": [
			"تغيير لون الخلفية ثم إغلاق المشروع",
			"حساب الاتجاه، تعيين velocity، ثم move_and_slide",
			"استخدام print فقط"
		],
		"correct": 1,
		"feedback": "صحيح. move_and_slide تطبّق حركة الجسم الفيزيائي اعتمادًا على velocity وتتعامل مع التصادم."
	},
	{
		"title": "5 — تصدير Android",
		"explanation": "تصدير لعبة Android يختلف عن بناء محرر Godot نفسه. تحتاج إلى إعداد Android SDK وملفات تصدير مطابقة لإصدار المحرك، ثم إعداد اسم الحزمة والتوقيع والصلاحيات.",
		"mission": "تعرف على الفرق بين ملف APK الخاص بلعبتك وملف APK الخاص بمحرر Godot. الأول يشغّل لعبتك؛ والثاني هو بيئة التطوير نفسها.",
		"hint": "من Godot 4.6 أصبح التصدير باستخدام Gradle ممكنًا من محرر Android بمساعدة تطبيق Godot Android Build Environment. التصدير بالقوالب الجاهزة لا يحتاج هذا التطبيق.",
		"snippet": """Game APK ≠ Godot Editor APK

Game APK: يشغّل المنتج.
Editor APK: يفتح المحرر لإنشاء المشاريع وتعديلها.""",
		"question": "ما الفرق بين APK اللعبة وAPK المحرر؟",
		"options": [
			"لا يوجد فرق",
			"APK اللعبة يشغّل المنتج؛ وAPK المحرر أداة التطوير",
			"APK المحرر صورة ثابتة"
		],
		"correct": 1,
		"feedback": "تمييز مهم: مشروعنا النهائي يحتاج نسخة محرر مشتقة من Godot، لا مجرد لعبة APK."
	},
	{
		"title": "6 — الإشارات Signals",
		"explanation": "الإشارة رسالة تصدر من عقدة عندما يحدث شيء، ويمكن لعقدة أخرى الاستماع إليها. هذا يقلل الاعتماد المباشر بين أجزاء اللعبة.",
		"mission": "تخيّل أن اللاعب يخبر واجهة المستخدم عندما تتغير صحته. اربط إشارة health_changed بدالة في واجهة الصحة بدل أن تجعل اللاعب يعدّل عناصر الواجهة مباشرة.",
		"hint": "عرّف signal، ثم استخدم emit لإرسالها، واربطها بدالة عبر connect.",
		"snippet": """signal health_changed(new_health: int)

var health: int = 100

func take_damage(amount: int) -> void:
	health = maxi(health - amount, 0)
	health_changed.emit(health)""",
		"question": "لماذا نستخدم Signals غالبًا؟",
		"options": [
			"لجعل كل العقدة تكتب داخل ملف واحد",
			"لإرسال أحداث بين العقد دون ربطها ببعض بقوة",
			"لتحويل المشهد إلى صورة"
		],
		"correct": 1,
		"feedback": "الإشارات تفصل مصدر الحدث عن الجزء الذي يستجيب له."
	},
	{
		"title": "7 — Area2D واكتشاف التلامس",
		"explanation": "Area2D منطقة تكشف دخول الأجسام إليها أو خروجها منها. تُستخدم لالتقاط العملات، ومناطق الضرر، ومجالات الرؤية، ومناطق التفعيل.",
		"mission": "أضف Area2D إلى مشهد، وأضف لها CollisionShape2D. فعّل مراقبة التصادم، ثم اربط body_entered بدالة تعرض رسالة عندما يدخل اللاعب.",
		"hint": "Area2D لا تحرّك الجسم بنفسها. إنها ترصد التداخل وترسل إشارة عند دخول جسم مناسب.",
		"snippet": """extends Area2D

func _ready() -> void:
	body_entered.connect(_on_body_entered)

func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("player"):
		print("دخل اللاعب المنطقة")""",
		"question": "ما الاستخدام الصحيح لـ Area2D؟",
		"options": [
			"اكتشاف دخول جسم إلى منطقة",
			"تغيير دقة الشاشة",
			"استبدال كل أنواع العقد"
		],
		"correct": 0,
		"feedback": "Area2D ترصد التداخلات وترسل إشارات مثل body_entered."
	},
	{
		"title": "8 — واجهة المستخدم Control",
		"explanation": "عقد Control هي أساس واجهات Godot: الأزرار، والملصقات النصية، والصور، واللوحات والحاويات. تختلف عن Node2D لأنها مصممة للتخطيط داخل مساحة الواجهة.",
		"mission": "أنشئ مشهد واجهة من Control، وضع Label باسم ScoreLabel. اقرأ المثال لترى كيف يتغير النص عندما تزيد النقاط.",
		"hint": "المسار $ScoreLabel يعني الوصول إلى عقدة ابن اسمها ScoreLabel من العقدة الحالية.",
		"snippet": """extends Control

@onready var score_label: Label = $ScoreLabel
var score: int = 0

func add_point() -> void:
	score += 1
	score_label.text = "النقاط: %d" % score""",
		"question": "أي عقدة هي الأنسب لبناء زر وملصق نصي؟",
		"options": [
			"RigidBody2D",
			"Control مع Button وLabel",
			"AudioStreamPlayer3D"
		],
		"correct": 1,
		"feedback": "Control هو الأساس لعناصر الواجهة والتخطيط."
	},
	{
		"title": "9 — المؤقت Timer",
		"explanation": "Timer عقدة تنفّذ إشارة timeout بعد مدة محددة. تستطيع جعلها تعمل مرة واحدة أو تتكرر، وهي مفيدة للعد التنازلي وإعادة ظهور العناصر وتأخير الأحداث.",
		"mission": "أضف Timer إلى مشهد Node. غيّر wait_time إلى ثانيتين، ثم جرّب تشغيله والاستماع إلى timeout.",
		"hint": "استدعاء start يبدأ العد. أما one_shot فيحدد ما إذا كان المؤقت يتوقف بعد أول انتهاء.",
		"snippet": """extends Node

@onready var timer: Timer = $Timer

func _ready() -> void:
	timer.timeout.connect(_on_timer_timeout)
	timer.start()

func _on_timer_timeout() -> void:
	print("انتهى الوقت")""",
		"question": "متى تصدر إشارة timeout؟",
		"options": [
			"عندما تنتهي مدة المؤقت",
			"عند حفظ المشروع فقط",
			"عند تغيير لون العقدة"
		],
		"correct": 0,
		"feedback": "تصدر timeout بعد انقضاء wait_time ما دام المؤقت يعمل."
	},
	{
		"title": "10 — التحريك AnimationPlayer",
		"explanation": "AnimationPlayer يشغّل مسارات حركة محفوظة: موضع، ودوران، وحجم، وشفافية، وخصائص أخرى. تستطيع تشغيل الأنيميشن من سكربت أو من محرر التحريك.",
		"mission": "أنشئ AnimationPlayer داخل مشهد، وأنشئ حركة باسم intro. أضف مسارًا يحرك موضع Sprite2D أو يغيّر شفافيته.",
		"hint": "تأكد من أن اسم الحركة في السكربت يطابق اسم الحركة الذي حفظته في AnimationPlayer.",
		"snippet": """extends Node2D

@onready var animation_player: AnimationPlayer = $AnimationPlayer

func play_intro() -> void:
	if animation_player.has_animation("intro"):
		animation_player.play("intro")""",
		"question": "ما الذي يديره AnimationPlayer؟",
		"options": [
			"تخزين حسابات المستخدمين",
			"تشغيل مسارات تحريك خصائص العقد",
			"ضغط ملفات الصوت"
		],
		"correct": 1,
		"feedback": "AnimationPlayer يشغّل حركة الخصائص على خط زمني."
	},
	{
		"title": "11 — حفظ البيانات",
		"explanation": "بيانات التقدم والنتائج ينبغي أن تبقى بعد إغلاق اللعبة. في هذا المثال نحفظ أفضل نتيجة في ملف JSON داخل user://، وهو مجلد بيانات التطبيق.",
		"mission": "اقرأ المثال، ثم جرّب حفظ قيمة أفضل نتيجة. افتح الملف لاحقًا للتأكد من أن النص حُفظ.",
		"hint": "استخدم FileAccess.WRITE للكتابة، ثم JSON.stringify لتحويل القاموس إلى نص JSON.",
		"snippet": """func save_best_score(score: int) -> void:
	var file := FileAccess.open("user://save.json", FileAccess.WRITE)
	if file != null:
		file.store_string(JSON.stringify({"best_score": score}))""",
		"question": "لماذا نستخدم المسار user:// للحفظ؟",
		"options": [
			"لأنه مساحة بيانات التطبيق المناسبة لملفات المستخدم",
			"لأنه يحفظ الملفات داخل محرر Godot نفسه",
			"لأنه يمنع حفظ أي بيانات"
		],
		"correct": 0,
		"feedback": "user:// مخصص لملفات بيانات التطبيق، وليس لأصول المشروع الثابتة."
	},
	{
		"title": "12 — قراءة البيانات",
		"explanation": "بعد حفظ نتيجة اللعبة، تحتاج إلى قراءتها عند بدء التشغيل. يجب فحص وجود الملف ونجاح فتحه وصحة محتوى JSON قبل استخدام القيم.",
		"mission": "اربط دالة load_best_score ببدء اللعبة، واجعلها تعيد صفرًا إذا لم يوجد ملف حفظ بعد.",
		"hint": "JSON.parse_string يعيد Variant؛ افحص أنه Dictionary قبل قراءة best_score.",
		"snippet": """func load_best_score() -> int:
	if not FileAccess.file_exists("user://save.json"):
		return 0
	var file := FileAccess.open("user://save.json", FileAccess.READ)
	if file == null:
		return 0
	var data = JSON.parse_string(file.get_as_text())
	if data is Dictionary:
		return int(data.get("best_score", 0))
	return 0""",
		"question": "لماذا نفحص نوع نتيجة JSON قبل قراءة المفتاح؟",
		"options": [
			"لأن تحليل JSON قد يعيد قيمة ليست قاموسًا",
			"لأن كل ملفات JSON صور",
			"لأن Godot لا يدعم الأعداد"
		],
		"correct": 0,
		"feedback": "الفحص يمنع التعامل مع قيمة غير متوقعة على أنها قاموس."
	},
	{
		"title": "13 — مجموعات العقد Groups",
		"explanation": "المجموعات تسهّل تصنيف العقد حسب دورها، مثل player أو enemies أو interactable. يمكنك استدعاء دوال على كل أعضاء مجموعة أو اختبار انتماء عقدة إليها.",
		"mission": "أضف اللاعب إلى مجموعة player، والأعداء إلى enemies. استخدم is_in_group لتحديد ما إذا كانت العقدة عدوًا.",
		"hint": "أسماء المجموعات نصوص، ومن الأفضل أن تكون واضحة وثابتة في المشروع.",
		"snippet": """func _ready() -> void:
	add_to_group("enemies")

func check_target(target: Node) -> void:
	if target.is_in_group("player"):
		print("هذا هو اللاعب")""",
		"question": "ما فائدة Groups؟",
		"options": [
			"تنظيم العقد والوصول إلى مجموعة منها حسب الدور",
			"استبدال المشاهد",
			"إنشاء ملفات APK تلقائيًا"
		],
		"correct": 0,
		"feedback": "المجموعات طريقة عملية لتجميع العقد واستهدافها دون الحاجة إلى مسارات ثابتة."
	},
	{
		"title": "14 — اكتشاف الأخطاء Debugger",
		"explanation": "المصحح يعرض الأخطاء والاستثناءات ومكدس الاستدعاءات. استخدم رسائل الطباعة المؤقتة، ونقاط التوقف، وافحص القيم بدل محاولة تغيير عدة أشياء عشوائيًا.",
		"mission": "شغّل مثالًا فيه قيمة صحة، وراقب تغيرها في Output. بعد ذلك ضع نقطة توقف داخل الدالة وافحص المتغيرات.",
		"hint": "الخطأ الأحمر في لوحة Debugger غالبًا يعرض الملف ورقم السطر. ابدأ بأول خطأ في القائمة لأنه قد يسبب أخطاء لاحقة.",
		"snippet": """var health: int = 10

func take_damage(amount: int) -> void:
	health -= amount
	print("health =", health)
	assert(health >= 0, "الصحة أصبحت سالبة")""",
		"question": "ما أفضل بداية عند ظهور خطأ في Debugger؟",
		"options": [
			"إعادة كتابة المشروع كله",
			"قراءة أول رسالة خطأ وفتح الملف والسطر المشار إليهما",
			"حذف جميع العقد"
		],
		"correct": 1,
		"feedback": "ابدأ بأول خطأ وسطره؛ قد تكون بقية الرسائل نتيجة له."
	},
	{
		"title": "15 — InputMap وأزرار التحكم",
		"explanation": "InputMap يسمح بتعريف أفعال مثل jump أو attack وربطها بعدة أزرار. ثم تستعمل الاسم داخل السكربت بدل ربط الحركة بمفتاح واحد.",
		"mission": "من Project Settings افتح Input Map وأضف فعلًا باسم jump، ثم اربطه بمفتاح Space. اقرأ المثال الذي يتحقق من ضغطه.",
		"hint": "استخدم is_action_just_pressed للاستجابة مرة عند بداية الضغط، وis_action_pressed للاستمرار أثناء الضغط.",
		"snippet": """func _process(_delta: float) -> void:
	if Input.is_action_just_pressed("jump"):
		print("قفز!")""",
		"question": "ما ميزة تعريف فعل jump في InputMap؟",
		"options": [
			"يمكن ربط أكثر من وسيلة إدخال بالفعل نفسه",
			"يجعل اللعبة تعمل دون مشهد",
			"يحذف الحاجة إلى معالجة الإدخال"
		],
		"correct": 0,
		"feedback": "InputMap يفصل معنى الفعل عن المفتاح الفعلي، ويسهّل دعم لوحة المفاتيح واللمس واليد."
	}

]

var _current_lesson: int = 0
var _completed: Dictionary = {}
var _quiz_passed: Dictionary = {}

var _lesson_picker: OptionButton
var _progress_bar: ProgressBar
var _step_label: Label
var _title_label: Label
var _explanation_label: Label
var _mission_label: Label
var _hint_label: Label
var _snippet_edit: TextEdit
var _question_label: Label
var _answers_box: VBoxContainer
var _feedback_label: Label
var _task_button: Button
var _practice_button: Button
var _hint_button: Button
var _previous_button: Button
var _next_button: Button


func _ready() -> void:
	layout_direction = Control.LAYOUT_DIRECTION_RTL
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	size_flags_vertical = Control.SIZE_EXPAND_FILL
	custom_minimum_size = Vector2(280, 0)
	add_theme_constant_override("separation", 8)
	_load_progress()
	_build_ui()
	_render_lesson()


func _build_ui() -> void:
	var header := Label.new()
	header.text = "مرشد Godot"
	header.add_theme_font_size_override("font_size", 23)
	header.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	add_child(header)

	var subtitle := _make_label("تعلّم بالممارسة، داخل محرر Godot نفسه.", 12)
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	add_child(subtitle)

	_progress_bar = ProgressBar.new()
	_progress_bar.min_value = 0.0
	_progress_bar.max_value = 100.0
	_progress_bar.show_percentage = true
	_progress_bar.custom_minimum_size = Vector2(0, 18)
	add_child(_progress_bar)

	_step_label = _make_label("", 12)
	add_child(_step_label)

	_lesson_picker = OptionButton.new()
	_lesson_picker.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	for lesson in LESSONS:
		_lesson_picker.add_item(str(lesson["title"]))
	_lesson_picker.item_selected.connect(_on_lesson_selected)
	add_child(_lesson_picker)

	var scroll := ScrollContainer.new()
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	add_child(scroll)

	var content := VBoxContainer.new()
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 8)
	scroll.add_child(content)

	_title_label = _make_label("", 19)
	content.add_child(_title_label)

	_explanation_label = _make_label("", 14)
	content.add_child(_explanation_label)

	_mission_label = _make_label("", 14)
	content.add_child(_mission_label)

	_hint_button = Button.new()
	_hint_button.text = "اعرض التلميح"
	_hint_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_hint_button.pressed.connect(_toggle_hint)
	content.add_child(_hint_button)

	_hint_label = _make_label("", 13)
	_hint_label.visible = false
	content.add_child(_hint_label)

	var code_header := _make_label("مثال عملي", 13)
	content.add_child(code_header)

	_snippet_edit = TextEdit.new()
	_snippet_edit.editable = false
	_snippet_edit.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
	_snippet_edit.layout_direction = Control.LAYOUT_DIRECTION_LTR
	_snippet_edit.custom_minimum_size = Vector2(0, 118)
	_snippet_edit.add_theme_font_size_override("font_size", 12)
	content.add_child(_snippet_edit)

	var code_actions := HBoxContainer.new()
	content.add_child(code_actions)

	var copy_button := Button.new()
	copy_button.text = "نسخ المثال"
	copy_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	copy_button.pressed.connect(_copy_snippet)
	code_actions.add_child(copy_button)

	_practice_button = Button.new()
	_practice_button.text = "أنشئ مشهد التدريب"
	_practice_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_practice_button.pressed.connect(_create_practice_scene)
	code_actions.add_child(_practice_button)

	var separator := HSeparator.new()
	content.add_child(separator)

	_question_label = _make_label("", 15)
	content.add_child(_question_label)

	_answers_box = VBoxContainer.new()
	_answers_box.add_theme_constant_override("separation", 5)
	content.add_child(_answers_box)

	_feedback_label = _make_label("", 13)
	content.add_child(_feedback_label)

	_task_button = Button.new()
	_task_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_task_button.custom_minimum_size = Vector2(0, 42)
	_task_button.pressed.connect(_toggle_completed)
	add_child(_task_button)

	var navigation := HBoxContainer.new()
	add_child(navigation)

	_previous_button = Button.new()
	_previous_button.text = "السابق"
	_previous_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_previous_button.pressed.connect(_go_previous)
	navigation.add_child(_previous_button)

	_next_button = Button.new()
	_next_button.text = "التالي"
	_next_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_next_button.pressed.connect(_go_next)
	navigation.add_child(_next_button)


func _make_label(value: String, font_size: int) -> Label:
	var label := Label.new()
	label.text = value
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.add_theme_font_size_override("font_size", font_size)
	return label


func _render_lesson() -> void:
	var lesson: Dictionary = LESSONS[_current_lesson]
	_title_label.text = str(lesson["title"])
	_explanation_label.text = str(lesson["explanation"])
	_mission_label.text = "مهمتك: " + str(lesson["mission"])
	_hint_label.text = "تلميح: " + str(lesson["hint"])
	_hint_label.visible = false
	_hint_button.text = "اعرض التلميح"
	_snippet_edit.text = str(lesson["snippet"])
	_question_label.text = "اختبر فهمك: " + str(lesson["question"])
	_feedback_label.text = ""
	_feedback_label.remove_theme_color_override("font_color")
	_practice_button.visible = _current_lesson == 3

	for child in _answers_box.get_children():
		_answers_box.remove_child(child)
		child.queue_free()

	var options: Array = lesson["options"]
	for option_index in range(options.size()):
		var answer_button := Button.new()
		answer_button.text = str(options[option_index])
		answer_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		answer_button.custom_minimum_size = Vector2(0, 40)
		answer_button.pressed.connect(_on_answer_selected.bind(option_index))
		_answers_box.add_child(answer_button)

	_step_label.text = "الدرس %d من %d" % [_current_lesson + 1, LESSONS.size()]
	_lesson_picker.select(_current_lesson)
	_previous_button.disabled = _current_lesson == 0
	_next_button.text = "اكتمل المنهج" if _current_lesson == LESSONS.size() - 1 else "الدرس التالي"
	_next_button.disabled = _current_lesson == LESSONS.size() - 1
	_task_button.text = "تم إنجاز التطبيق ✓" if bool(_completed.get(_current_lesson, false)) else "علّمت التطبيق كمكتمل"
	_update_progress()


func _update_progress() -> void:
	var finished_count := 0
	for lesson_index in range(LESSONS.size()):
		if bool(_completed.get(lesson_index, false)):
			finished_count += 1
	_progress_bar.value = float(finished_count) / float(LESSONS.size()) * 100.0


func _on_lesson_selected(index: int) -> void:
	_current_lesson = clampi(index, 0, LESSONS.size() - 1)
	_save_progress()
	_render_lesson()


func _on_answer_selected(answer_index: int) -> void:
	var lesson: Dictionary = LESSONS[_current_lesson]
	if answer_index == int(lesson["correct"]):
		_quiz_passed[_current_lesson] = true
		_feedback_label.text = "إجابة صحيحة. " + str(lesson["feedback"])
		_feedback_label.add_theme_color_override("font_color", Color(0.25, 0.72, 0.42))
	else:
		_feedback_label.text = "ليست هذه الإجابة. أعد قراءة الشرح أو افتح التلميح."
		_feedback_label.add_theme_color_override("font_color", Color(0.88, 0.52, 0.24))
	_save_progress()


func _toggle_hint() -> void:
	_hint_label.visible = not _hint_label.visible
	_hint_button.text = "أخفِ التلميح" if _hint_label.visible else "اعرض التلميح"


func _toggle_completed() -> void:
	var was_completed := bool(_completed.get(_current_lesson, false))
	_completed[_current_lesson] = not was_completed
	_task_button.text = "تم إنجاز التطبيق ✓" if not was_completed else "علّمت التطبيق كمكتمل"
	_update_progress()
	_save_progress()


func _copy_snippet() -> void:
	var snippet := _snippet_edit.text
	if snippet.strip_edges().is_empty():
		return
	DisplayServer.clipboard_set(snippet)
	_feedback_label.text = "نُسخ المثال. ألصقه في سكربت داخل Godot."
	_feedback_label.remove_theme_color_override("font_color")


func _go_previous() -> void:
	_current_lesson = maxi(0, _current_lesson - 1)
	_save_progress()
	_render_lesson()


func _go_next() -> void:
	if _current_lesson < LESSONS.size() - 1:
		_current_lesson += 1
	_save_progress()
	_render_lesson()


func _load_progress() -> void:
	var config := ConfigFile.new()
	if config.load(PROGRESS_FILE) != OK:
		return

	var saved_completed = config.get_value("mentor", "completed", [])
	var saved_quizzes = config.get_value("mentor", "quizzes", [])
	_current_lesson = clampi(int(config.get_value("mentor", "current_lesson", 0)), 0, LESSONS.size() - 1)

	for item in saved_completed:
		_completed[int(item)] = true
	for item in saved_quizzes:
		_quiz_passed[int(item)] = true


func _save_progress() -> void:
	var config := ConfigFile.new()
	config.set_value("mentor", "current_lesson", _current_lesson)

	var completed_items: Array = []
	var quiz_items: Array = []
	for lesson_index in range(LESSONS.size()):
		if bool(_completed.get(lesson_index, false)):
			completed_items.append(lesson_index)
		if bool(_quiz_passed.get(lesson_index, false)):
			quiz_items.append(lesson_index)

	config.set_value("mentor", "completed", completed_items)
	config.set_value("mentor", "quizzes", quiz_items)
	config.save(PROGRESS_FILE)


func _create_practice_scene() -> void:
	var lessons_dir := ProjectSettings.globalize_path("res://lessons")
	var make_dir_error := DirAccess.make_dir_recursive_absolute(lessons_dir)
	if make_dir_error != OK and make_dir_error != ERR_ALREADY_EXISTS:
		_feedback_label.text = "تعذّر إنشاء مجلد التدريب: " + error_string(make_dir_error)
		return

	var script_path := "res://lessons/practice_player.gd"
	var scene_path := "res://lessons/practice_player.tscn"
	var script_source := """extends CharacterBody2D

@export var speed: float = 240.0

func _physics_process(_delta: float) -> void:
	var direction := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
	velocity = direction * speed
	move_and_slide()
"""
	var script_file := FileAccess.open(script_path, FileAccess.WRITE)
	if script_file == null:
		_feedback_label.text = "تعذّر إنشاء السكربت: " + error_string(FileAccess.get_open_error())
		return
	script_file.store_string(script_source)
	script_file.close()

	var player := CharacterBody2D.new()
	player.name = "Player"
	player.set_script(load(script_path))

	var image := Image.create(64, 64, false, Image.FORMAT_RGBA8)
	image.fill(Color(0.12, 0.67, 0.88, 1.0))
	var sprite := Sprite2D.new()
	sprite.name = "Sprite2D"
	sprite.texture = ImageTexture.create_from_image(image)
	player.add_child(sprite)
	sprite.owner = player

	var shape := CircleShape2D.new()
	shape.radius = 24.0
	var collision := CollisionShape2D.new()
	collision.name = "CollisionShape2D"
	collision.shape = shape
	player.add_child(collision)
	collision.owner = player

	var camera := Camera2D.new()
	camera.name = "Camera2D"
	camera.enabled = true
	player.add_child(camera)
	camera.owner = player

	var packed_scene := PackedScene.new()
	var pack_error := packed_scene.pack(player)
	if pack_error != OK:
		player.free()
		_feedback_label.text = "تعذّر تجهيز المشهد: " + error_string(pack_error)
		return

	var save_error := ResourceSaver.save(packed_scene, scene_path)
	player.free()
	if save_error != OK:
		_feedback_label.text = "تعذّر حفظ المشهد: " + error_string(save_error)
		return

	EditorInterface.get_resource_filesystem().scan()
	EditorInterface.open_scene_from_path(scene_path)
	_feedback_label.text = "أنشأنا مشهد Player وسكربت الحركة. شغّل المشهد وجرب مفاتيح الأسهم."
	_feedback_label.remove_theme_color_override("font_color")
